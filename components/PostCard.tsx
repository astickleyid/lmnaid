import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share, MoreHorizontal, BarChart2, Repeat2 } from 'lucide-react';
import { Post, User as UserType } from '../types';

interface PostCardProps {
  post: Post;
  currentUser?: UserType;
}

export const PostCard: React.FC<PostCardProps> = ({ post, currentUser }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);

  const handleLike = () => {
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    setIsLiked(!isLiked);
  };

  return (
    <article className="flex gap-3 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors cursor-pointer group px-4 rounded-xl -mx-4 py-2" role="article">
       {/* Avatar Column */}
       <div className="shrink-0 pt-1">
          <img 
            src={post.author.avatarUrl} 
            alt={post.author.name} 
            className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity" 
          />
       </div>

       {/* Content Column */}
       <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-hidden text-[15px]">
                  <span className="font-bold text-white truncate hover:underline decoration-white">{post.author.name}</span>
                  <span className="text-zinc-500 truncate">{post.author.handle}</span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-500 hover:underline">{post.timestamp}</span>
              </div>
              <button className="text-zinc-500 hover:text-primary hover:bg-primary/10 p-1.5 rounded-full transition-colors group-hover:opacity-100 opacity-0">
                  <MoreHorizontal size={18} />
              </button>
          </div>

          {/* Body */}
          <div className="text-[15px] text-[#e7e9ea] whitespace-pre-wrap leading-normal mt-0.5 mb-3">
              {post.content}
          </div>

          {post.image && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-zinc-800">
                  <img src={post.image} alt="Content" className="w-full h-auto object-cover max-h-[500px]" />
              </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between max-w-md text-zinc-500 -ml-2" role="group" aria-label="Post actions">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
                className="flex items-center gap-2 group/action p-2 rounded-full hover:bg-blue-500/10 transition-colors"
              >
                  <MessageCircle size={18} className="group-hover/action:text-blue-500" />
                  <span className="text-xs group-hover/action:text-blue-500">{post.comments || ''}</span>
              </button>

              <button className="flex items-center gap-2 group/action p-2 rounded-full hover:bg-green-500/10 transition-colors">
                  <Repeat2 size={18} className="group-hover/action:text-green-500" />
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                className="flex items-center gap-2 group/action p-2 rounded-full hover:bg-pink-500/10 transition-colors"
              >
                  <div className="relative">
                      {isLiked ? (
                          <Heart size={18} className="text-pink-600 fill-pink-600" />
                      ) : (
                          <Heart size={18} className="group-hover/action:text-pink-500" />
                      )}
                  </div>
                  <span className={`text-xs ${isLiked ? 'text-pink-600' : 'group-hover/action:text-pink-500'}`}>
                      {likeCount || ''}
                  </span>
              </button>

              <button className="flex items-center gap-2 group/action p-2 rounded-full hover:bg-blue-500/10 transition-colors">
                  <BarChart2 size={18} className="group-hover/action:text-blue-500" />
              </button>

              <button className="flex items-center gap-2 group/action p-2 rounded-full hover:bg-blue-500/10 transition-colors">
                  <Share size={18} className="group-hover/action:text-blue-500" />
              </button>
          </div>
       </div>
    </article>
  );
};