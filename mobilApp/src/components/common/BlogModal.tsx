import React, { useEffect, useRef } from 'react';
import { X, Calendar, Person } from 'react-bootstrap-icons';
import { BlogPost } from '../../types';

interface BlogModalProps {
  post: BlogPost;
  isOpen: boolean;
  onClose: () => void;
}

export function BlogModal({ post, isOpen, onClose }: BlogModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getFeaturedImage = (post: BlogPost) => {
    if (post._embedded?.['wp:featuredmedia']?.[0]) {
      return post._embedded['wp:featuredmedia'][0].source_url;
    }
    return '/api/placeholder/800/400';
  };

  const getAuthorName = (post: BlogPost) => {
    if (post._embedded?.author?.[0]) {
      return post._embedded.author[0].name;
    }
    return 'Auteur';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h1 
            className="font-bold text-xl text-gray-900 dark:text-white flex-1 mr-4"
            dangerouslySetInnerHTML={{ __html: post.title.rendered }}
          />
          <button
            onClick={onClose}
            className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex-shrink-0"
          >
            <X className="h-5 w-5 text-gray-800 dark:text-gray-100" />
          </button>
        </div>

        <div className="p-6">
          {/* Featured Image */}
          <div className="mb-6">
            <img
              src={getFeaturedImage(post)}
              alt={post.title.rendered}
              className="w-full h-64 object-cover rounded-lg shadow-md"
            />
          </div>

          {/* Post Meta */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{formatDate(post.date)}</span>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div 
            className="prose prose-lg dark:text-white dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-blockquote:border-l-primary-600 dark:prose-blockquote:border-l-primary-400"
            dangerouslySetInnerHTML={{ __html: post.content.rendered }}
          />

          {/* Post Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div>
                Publié le {formatDate(post.date)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}