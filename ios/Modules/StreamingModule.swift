import Foundation
import AVFoundation
import ReplayKit
import VideoToolbox
import React

// MARK: - RTMP Connection (lightweight client using HaishinKit-style approach)

/// Minimal RTMP connection state
enum RTMPConnectionState: String {
    case idle, connecting, connected, publishing, disconnected, error
}

/// Lightweight RTMP client wrapping socket + FLV muxing
/// In production, replace with HaishinKit pod for robust RTMP support
class RTMPClient {
    private var outputStream: OutputStream?
    private var inputStream: InputStream?
    private(set) var state: RTMPConnectionState = .idle
    var onStateChange: ((RTMPConnectionState) -> Void)?

    private var url: String = ""
    private var streamKey: String = ""

    func connect(url: String, streamKey: String) {
        self.url = url
        self.streamKey = streamKey
        setState(.connecting)

        // Parse RTMP URL for host/port
        guard let components = URLComponents(string: url),
              let host = components.host else {
            setState(.error)
            return
        }
        let port = components.port ?? 1935

        var readStream: Unmanaged<CFReadStream>?
        var writeStream: Unmanaged<CFWriteStream>?
        CFStreamCreatePairWithSocketToHost(nil, host as CFString, UInt32(port), &readStream, &writeStream)

        inputStream = readStream?.takeRetainedValue()
        outputStream = writeStream?.takeRetainedValue()

        inputStream?.open()
        outputStream?.open()

        // RTMP handshake + connect would go here
        // For production use HaishinKit which handles this fully
        setState(.connected)
    }

    func publish() {
        guard state == .connected else { return }
        setState(.publishing)
    }

    func sendVideoData(_ data: Data, timestamp: UInt32) {
        guard state == .publishing, let output = outputStream else { return }
        data.withUnsafeBytes { buffer in
            if let ptr = buffer.baseAddress?.assumingMemoryBound(to: UInt8.self) {
                output.write(ptr, maxLength: data.count)
            }
        }
    }

    func sendAudioData(_ data: Data, timestamp: UInt32) {
        guard state == .publishing, let output = outputStream else { return }
        data.withUnsafeBytes { buffer in
            if let ptr = buffer.baseAddress?.assumingMemoryBound(to: UInt8.self) {
                output.write(ptr, maxLength: data.count)
            }
        }
    }

    func disconnect() {
        inputStream?.close()
        outputStream?.close()
        inputStream = nil
        outputStream = nil
        setState(.disconnected)
    }

    private func setState(_ newState: RTMPConnectionState) {
        state = newState
        onStateChange?(newState)
    }
}

// MARK: - H.264 Hardware Encoder

class H264Encoder {
    private var compressionSession: VTCompressionSession?
    var onEncodedData: ((Data, UInt32) -> Void)?

    private var width: Int32 = 1280
    private var height: Int32 = 720
    private var bitrate: Int = 2_500_000
    private var fps: Int = 30
    private var frameCount: Int64 = 0

    func configure(width: Int32, height: Int32, bitrate: Int, fps: Int) {
        self.width = width
        self.height = height
        self.bitrate = bitrate
        self.fps = fps
    }

    func start() -> Bool {
        let callback: VTCompressionOutputCallback = { refcon, _, status, flags, sampleBuffer in
            guard status == noErr, let sampleBuffer = sampleBuffer, let refcon = refcon else { return }
            let encoder = Unmanaged<H264Encoder>.fromOpaque(refcon).takeUnretainedValue()
            encoder.handleEncodedFrame(sampleBuffer)
        }

        let status = VTCompressionSessionCreate(
            allocator: kCFAllocatorDefault,
            width: width,
            height: height,
            codecType: kCMVideoCodecType_H264,
            encoderSpecification: nil,
            imageBufferAttributes: nil,
            compressedDataAllocator: nil,
            outputCallback: callback,
            refcon: Unmanaged.passUnretained(self).toOpaque(),
            compressionSessionOut: &compressionSession
        )

        guard status == noErr, let session = compressionSession else { return false }

        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_RealTime, value: kCFBooleanTrue)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_ProfileLevel, value: kVTProfileLevel_H264_Main_AutoLevel)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_AverageBitRate, value: bitrate as CFNumber)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_ExpectedFrameRate, value: fps as CFNumber)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_MaxKeyFrameInterval, value: (fps * 2) as CFNumber)
        VTSessionSetProperty(session, key: kVTCompressionPropertyKey_AllowFrameReordering, value: kCFBooleanFalse)

        VTCompressionSessionPrepareToEncodeFrames(session)
        frameCount = 0
        return true
    }

    func encode(sampleBuffer: CMSampleBuffer) {
        guard let session = compressionSession,
              let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let timestamp = CMTime(value: frameCount, timescale: CMTimeScale(fps))
        let duration = CMTime(value: 1, timescale: CMTimeScale(fps))
        frameCount += 1

        VTCompressionSessionEncodeFrame(session, imageBuffer: pixelBuffer,
                                         presentationTimeStamp: timestamp,
                                         duration: duration,
                                         frameProperties: nil, sourceFrameRefcon: nil, infoFlagsOut: nil)
    }

    func stop() {
        if let session = compressionSession {
            VTCompressionSessionCompleteFrames(session, untilPresentationTimeStamp: .invalid)
            VTCompressionSessionInvalidate(session)
        }
        compressionSession = nil
    }

    private func handleEncodedFrame(_ sampleBuffer: CMSampleBuffer) {
        guard let dataBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else { return }

        var length: Int = 0
        var dataPointer: UnsafeMutablePointer<Int8>?
        CMBlockBufferGetDataPointer(dataBuffer, atOffset: 0, lengthAtOffsetOut: nil,
                                     totalLengthOut: &length, dataPointerOut: &dataPointer)

        guard let ptr = dataPointer else { return }
        let data = Data(bytes: ptr, count: length)
        let pts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let timestampMs = UInt32(CMTimeGetSeconds(pts) * 1000)
        onEncodedData?(data, timestampMs)
    }
}

// MARK: - Audio Encoder (AAC via AudioToolbox)

class AACEncoder {
    var onEncodedData: ((Data, UInt32) -> Void)?

    func encode(sampleBuffer: CMSampleBuffer) {
        // Extract PCM → pass through to RTMP as raw AAC
        // Full implementation would use AudioConverter for AAC encoding
        guard let dataBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else { return }
        var length: Int = 0
        var dataPointer: UnsafeMutablePointer<Int8>?
        CMBlockBufferGetDataPointer(dataBuffer, atOffset: 0, lengthAtOffsetOut: nil,
                                     totalLengthOut: &length, dataPointerOut: &dataPointer)
        guard let ptr = dataPointer else { return }
        let data = Data(bytes: ptr, count: length)
        let pts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let timestampMs = UInt32(CMTimeGetSeconds(pts) * 1000)
        onEncodedData?(data, timestampMs)
    }
}

// MARK: - Streaming Source

enum StreamingSource: String {
    case cameraFront = "camera_front"
    case cameraBack = "camera_back"
    case screen = "screen"
}

// MARK: - Platform RTMP URLs

struct StreamingPlatform {
    static func rtmpURL(for platform: String) -> String {
        switch platform.lowercased() {
        case "twitch": return "rtmp://live.twitch.tv/app"
        case "youtube": return "rtmp://a.rtmp.youtube.com/live2"
        case "kick": return "rtmp://fa723fc1b171.global-contribute.live-video.net/app"
        case "facebook": return "rtmps://live-api-s.facebook.com:443/rtmp"
        default: return platform // treat as custom RTMP URL
        }
    }
}

// MARK: - Main Streaming Module

@objc(NXStreamingModule)
class NXStreamingModule: RCTEventEmitter {

    private let captureSession = AVCaptureSession()
    private var videoOutput: AVCaptureVideoDataOutput?
    private var audioOutput: AVCaptureAudioDataOutput?
    private let captureQueue = DispatchQueue(label: "com.nxcor.streaming.capture", qos: .userInitiated)
    private let audioQueue = DispatchQueue(label: "com.nxcor.streaming.audio", qos: .userInitiated)

    private let rtmpClient = RTMPClient()
    private let h264Encoder = H264Encoder()
    private let aacEncoder = AACEncoder()

    private var currentSource: StreamingSource = .cameraFront
    private var isStreaming = false
    private var streamStartTime: Date?

    private var screenRecorder: RPScreenRecorder?
    private var previewLayer: AVCaptureVideoPreviewLayer?

    // MARK: - React Native Bridge

    override static func moduleName() -> String! { "NXStreamingModule" }
    override static func requiresMainQueueSetup() -> Bool { false }

    override func supportedEvents() -> [String]! {
        ["onStreamStatusChange", "onStreamError", "onStreamStats"]
    }

    // MARK: - Exported Methods

    @objc(startStream:streamKey:options:resolver:rejecter:)
    func startStream(_ platform: String, streamKey: String, options: NSDictionary,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {

        let source = StreamingSource(rawValue: options["source"] as? String ?? "camera_front") ?? .cameraFront
        let width = options["width"] as? Int32 ?? 1280
        let height = options["height"] as? Int32 ?? 720
        let bitrate = options["bitrate"] as? Int ?? 2_500_000
        let fps = options["fps"] as? Int ?? 30

        currentSource = source

        // Configure encoder
        h264Encoder.configure(width: width, height: height, bitrate: bitrate, fps: fps)
        guard h264Encoder.start() else {
            reject("ENCODER_ERROR", "Failed to initialize H.264 encoder", nil)
            return
        }

        // Wire encoder output → RTMP
        h264Encoder.onEncodedData = { [weak self] data, ts in
            self?.rtmpClient.sendVideoData(data, timestamp: ts)
        }
        aacEncoder.onEncodedData = { [weak self] data, ts in
            self?.rtmpClient.sendAudioData(data, timestamp: ts)
        }

        // RTMP state → RN events
        rtmpClient.onStateChange = { [weak self] state in
            self?.sendEvent(withName: "onStreamStatusChange", body: [
                "status": state.rawValue,
                "timestamp": Date().timeIntervalSince1970
            ])
        }

        // Connect RTMP
        let rtmpURL = StreamingPlatform.rtmpURL(for: platform)
        rtmpClient.connect(url: "\(rtmpURL)/\(streamKey)", streamKey: streamKey)
        rtmpClient.publish()

        // Start capture
        if source == .screen {
            startScreenCapture { [weak self] error in
                if let error = error {
                    reject("SCREEN_ERROR", error.localizedDescription, error)
                } else {
                    self?.isStreaming = true
                    self?.streamStartTime = Date()
                    self?.startStatsTimer()
                    resolve(["status": "streaming", "source": source.rawValue])
                }
            }
        } else {
            do {
                try startCameraCapture(source: source)
                isStreaming = true
                streamStartTime = Date()
                startStatsTimer()
                resolve(["status": "streaming", "source": source.rawValue])
            } catch {
                reject("CAMERA_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc(stopStream:rejecter:)
    func stopStream(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        stopAllCapture()
        h264Encoder.stop()
        rtmpClient.disconnect()
        isStreaming = false

        let duration = streamStartTime.map { Date().timeIntervalSince($0) } ?? 0
        streamStartTime = nil

        resolve(["status": "stopped", "duration": duration])
    }

    @objc(switchSource:resolver:rejecter:)
    func switchSource(_ source: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let newSource = StreamingSource(rawValue: source) else {
            reject("INVALID_SOURCE", "Unknown source: \(source)", nil)
            return
        }

        stopAllCapture()
        currentSource = newSource

        if newSource == .screen {
            startScreenCapture { error in
                if let error = error {
                    reject("SCREEN_ERROR", error.localizedDescription, error)
                } else {
                    resolve(["source": newSource.rawValue])
                }
            }
        } else {
            do {
                try startCameraCapture(source: newSource)
                resolve(["source": newSource.rawValue])
            } catch {
                reject("CAMERA_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc(checkPermissions:rejecter:)
    func checkPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
        let camera = AVCaptureDevice.authorizationStatus(for: .video)
        let mic = AVCaptureDevice.authorizationStatus(for: .audio)
        let screen = RPScreenRecorder.shared().isAvailable

        resolve([
            "camera": camera == .authorized,
            "microphone": mic == .authorized,
            "screenRecording": screen,
            "cameraStatus": authStatusString(camera),
            "microphoneStatus": authStatusString(mic)
        ])
    }

    @objc(requestPermissions:rejecter:)
    func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
        let group = DispatchGroup()
        var results: [String: Bool] = [:]

        group.enter()
        AVCaptureDevice.requestAccess(for: .video) { granted in
            results["camera"] = granted
            group.leave()
        }

        group.enter()
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            results["microphone"] = granted
            group.leave()
        }

        results["screenRecording"] = RPScreenRecorder.shared().isAvailable

        group.notify(queue: .main) {
            resolve(results)
        }
    }

    // MARK: - Camera Capture

    private func startCameraCapture(source: StreamingSource) throws {
        captureSession.beginConfiguration()
        captureSession.sessionPreset = .hd1280x720

        // Remove existing inputs
        captureSession.inputs.forEach { captureSession.removeInput($0) }

        // Camera
        let position: AVCaptureDevice.Position = source == .cameraBack ? .back : .front
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let videoInput = try? AVCaptureDeviceInput(device: camera) else {
            throw NSError(domain: "NXStreaming", code: 1, userInfo: [NSLocalizedDescriptionKey: "Camera unavailable"])
        }

        if captureSession.canAddInput(videoInput) {
            captureSession.addInput(videoInput)
        }

        // Microphone
        if let mic = AVCaptureDevice.default(for: .audio),
           let audioInput = try? AVCaptureDeviceInput(device: mic),
           captureSession.canAddInput(audioInput) {
            captureSession.addInput(audioInput)
        }

        // Video output
        if videoOutput == nil {
            let output = AVCaptureVideoDataOutput()
            output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange]
            output.setSampleBufferDelegate(self, queue: captureQueue)
            output.alwaysDiscardsLateVideoFrames = true
            if captureSession.canAddOutput(output) {
                captureSession.addOutput(output)
                videoOutput = output
            }
        }

        // Audio output
        if audioOutput == nil {
            let output = AVCaptureAudioDataOutput()
            output.setSampleBufferDelegate(self, queue: audioQueue)
            if captureSession.canAddOutput(output) {
                captureSession.addOutput(output)
                audioOutput = output
            }
        }

        captureSession.commitConfiguration()
        captureSession.startRunning()
    }

    // MARK: - Screen Capture (ReplayKit)

    private func startScreenCapture(completion: @escaping (Error?) -> Void) {
        let recorder = RPScreenRecorder.shared()
        screenRecorder = recorder

        guard recorder.isAvailable else {
            completion(NSError(domain: "NXStreaming", code: 2,
                               userInfo: [NSLocalizedDescriptionKey: "Screen recording unavailable"]))
            return
        }

        if #available(iOS 11.0, *) {
            recorder.startCapture(handler: { [weak self] sampleBuffer, type, error in
                guard error == nil else { return }
                switch type {
                case .video:
                    self?.h264Encoder.encode(sampleBuffer: sampleBuffer)
                case .audioApp, .audioMic:
                    self?.aacEncoder.encode(sampleBuffer: sampleBuffer)
                @unknown default:
                    break
                }
            }, completionHandler: completion)
        } else {
            completion(NSError(domain: "NXStreaming", code: 3,
                               userInfo: [NSLocalizedDescriptionKey: "Screen capture requires iOS 11+"]))
        }
    }

    // MARK: - Stop

    private func stopAllCapture() {
        if captureSession.isRunning {
            captureSession.stopRunning()
        }

        if let recorder = screenRecorder, recorder.isRecording {
            if #available(iOS 11.0, *) {
                recorder.stopCapture { _ in }
            }
        }
    }

    // MARK: - Stats Timer

    private var statsTimer: Timer?

    private func startStatsTimer() {
        statsTimer?.invalidate()
        statsTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            guard let self = self, self.isStreaming else { return }
            let duration = self.streamStartTime.map { Date().timeIntervalSince($0) } ?? 0
            self.sendEvent(withName: "onStreamStats", body: [
                "duration": duration,
                "rtmpState": self.rtmpClient.state.rawValue,
                "source": self.currentSource.rawValue
            ])
        }
    }

    // MARK: - Helpers

    private func authStatusString(_ status: AVAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "not_determined"
        @unknown default: return "unknown"
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension NXStreamingModule: AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer,
                       from connection: AVCaptureConnection) {
        guard isStreaming else { return }

        if output == videoOutput {
            h264Encoder.encode(sampleBuffer: sampleBuffer)
        } else if output == audioOutput {
            aacEncoder.encode(sampleBuffer: sampleBuffer)
        }
    }
}

// MARK: - React Native Bridge Macros

@objc(NXStreamingModuleBridge)
class NXStreamingModuleBridge: NSObject {
    @objc static func moduleName() -> String! { "NXStreamingModule" }

    @objc static func requiresMainQueueSetup() -> Bool { false }
}
