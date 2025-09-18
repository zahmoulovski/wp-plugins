import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, ChevronRight, House, Grid3x3, Search, Cart, Person, ChatDots, Gear, BoxArrowUpRight } from 'react-bootstrap-icons';
import { decodeHTMLEntities } from '../../utils/htmlUtils';
import { Category } from '../../types';
import { api } from '../../services/api';
import { cacheService } from '../../services/cache';
import { useApp } from '../../contexts/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { state } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [subcategories, setSubcategories] = useState<{ [key: number]: Category[] }>({});
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load main categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await api.getCategories();
        setAllCategories(data); // Store all categories
        const mainCategories = data.filter(cat => cat && cat.id && cat.name && cat.parent === 0);
        setCategories(mainCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Pre-load all subcategories when sidebar opens for better UX
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      const preloadSubcategories = async () => {
        try {
          const allCategories = await api.getCategories();
          const newSubcategories: { [key: number]: Category[] } = {};
          
          categories.forEach(category => {
            const subs = allCategories.filter(cat => cat.parent === category.id);
            newSubcategories[category.id] = subs;
          });
          
          setSubcategories(newSubcategories);
        } catch (error) {
          console.error('Error preloading subcategories:', error);
        }
      };
      
      // Use a timeout to avoid blocking the UI
      setTimeout(preloadSubcategories, 100);
    }
  }, [isOpen, categories.length]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const toggleCategory = async (categoryId: number) => {
    // Toggle only the clicked category, don't close others
    const newExpanded = new Set(expandedCategories);
    
    if (expandedCategories.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
      // Load subcategories if not already loaded
      if (!subcategories[categoryId]) {
        try {
          // Check cache first
          const cachedSubs = cacheService.getSubcategories(categoryId);
          if (cachedSubs) {
            setSubcategories(prev => ({ ...prev, [categoryId]: cachedSubs }));
          } else {
            const allCategories = await api.getCategories();
            // Remove the count > 0 filter to show ALL subcategories
            const subs = allCategories.filter(cat => cat.parent === categoryId);
            // Cache the subcategories
            cacheService.setSubcategories(categoryId, subs);
            setSubcategories(prev => ({ ...prev, [categoryId]: subs }));
          }
        } catch (error) {
          console.error('Error loading subcategories:', error);
        }
      }
    }
    
    setExpandedCategories(newExpanded);
  };

  // Check if a category has subcategories by checking all available categories
  const hasSubcategories = (categoryId: number): boolean => {
    // Check if there are any categories that have this categoryId as parent
    return allCategories.length > 0 && allCategories.some(cat => cat.parent === categoryId);
  };

  // Recursive component to render all levels of categories
  const renderCategoryTree = (parentId: number = 0, level: number = 0) => {
    const catsToRender = parentId === 0 ? categories : subcategories[parentId] || [];
    
    if (parentId !== 0 && !subcategories[parentId]) {
      return null;
    }
    
    return (
      <div className={`space-y-1 ${level > 0 ? 'ml-4 mt-1' : ''}`}>
        {catsToRender.map((category) => (
          <div key={category.id}>
            <div className="flex items-center group">
              <div className="flex-1 flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                {category.image && (
                  <img
                    src={category.image.src}
                    alt={decodeHTMLEntities(category.name)}
                    className="w-6 h-6 rounded object-cover"
                  />
                )}
                <Link
                  to={`/categories/${category.slug}`}
                  onClick={onClose}
                  className="flex-1 text-gray-900 dark:text-white font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400"
                >
                  {decodeHTMLEntities(category.name)}
                </Link>
                {hasSubcategories(category.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategory(category.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label={expandedCategories.has(category.id) ? "Masquer les sous-catégories" : "Afficher les sous-catégories"}
                  >
                    {expandedCategories.has(category.id) ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Recursive subcategories */}
            {expandedCategories.has(category.id) && hasSubcategories(category.id) && (
              <div className="ml-4 mt-1">
                {!subcategories[category.id] ? (
                  <div className="p-2 text-gray-500 dark:text-gray-400 text-sm">Chargement...</div>
                ) : (
                  renderCategoryTree(category.id, level + 1)
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const cartItemsCount = state.cart.reduce((total, item) => total + item.quantity, 0);

  const mainMenuItems = [
    { path: '/', icon: House, label: 'Accueil' },
    { path: '/contact', icon: ChatDots, label: 'Contact' },
    { path: '/categories', icon: Grid3x3, label: 'Catégories' },
    { path: '/search', icon: Search, label: 'Recherche' },
    { path: '/cart', icon: Cart, label: 'Panier', badge: cartItemsCount },
    { path: '/profile', icon: Person, label: 'Profil' },
  ];

  const secondaryMenuItems = [
    { path: '/settings', icon: Gear, label: 'Paramètres' },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300" />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Menu */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-1"
                >
                  <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white font-medium">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="ml-auto bg-secondary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Categories Accordion */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Catégories</h3>
            {renderCategoryTree()}
          </div>

          {/* Secondary Menu */}
          <div className="p-4">
            {secondaryMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-1"
                >
                  <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}