import React from 'react';

interface TypingIndicatorProps {
  userName: string;
  avatar?: string;
}

export default function TypingIndicator({ userName, avatar }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 animate-in fade-in slide-in-from-left-2">
      {avatar ? (
        <img
          src={avatar}
          alt={userName}
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
        />
      ) : (
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {userName.charAt(0).toUpperCase()}
        </div>
      )}
      
      <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
        <div className="flex gap-1.5">
          <span 
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span 
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          />
          <span 
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          />
        </div>
      </div>
      
      <span className="text-xs text-gray-500">{userName} печатает...</span>
    </div>
  );
}