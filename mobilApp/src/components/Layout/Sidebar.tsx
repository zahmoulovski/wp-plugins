import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, ChevronRight, Home, Grid3X3, Search, ShoppingCart, User, Package, Heart, MessageCircle, Settings } from 'lucide-react';
import { Category } from '../../types';
import { api } from '../../services/api';
import { cacheService } from '../../services/cache';
import { useApp } from '../../contexts/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryItemProps {
  category: Category;
  allCategories: Category[];
  level: number;
  expandedCategories: Set<number>;
  onToggleCategory: (categoryId: number) => void;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { state } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load all categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await api.getCategories();
        setAllCategories(data);
        const mainCategories = data.filter(cat => cat && cat.id && cat.name && cat.parent === 0);
        setCategories(mainCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

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

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    
    if (expandedCategories.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    
    setExpandedCategories(newExpanded);
  };

  const cartItemsCount = state.cart.reduce((total, item) => total + item.quantity, 0);

  // Recursive Category Item Component
  function CategoryItem({ category, allCategories, level, expandedCategories, onToggleCategory, onClose }: CategoryItemProps) {
    const [childCategories, setChildCategories] = useState<Category[]>([]);
    const hasChildren = childCategories.length > 0;

    useEffect(() => {
      // Find direct children of this category
      const children = allCategories.filter(cat => cat.parent === category.id && cat.count > 0);
      setChildCategories(children);
    }, [category.id, allCategories]);

    const isExpanded = expandedCategories.has(category.id);

    return (
      <div>
        <div className="flex items-center group" style={{ marginLeft: `${level * 16}px` }}>
          <Link
            to={`/categories/${category.slug}`}
            onClick={onClose}
            className="flex-1 flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {category.image && (
              <img
                src={category.image.src}
                alt={category.name}
                className="w-5 h-5 rounded object-cover"
              />
            )}
            <span className="text-gray-900 dark:text-white font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400">
              {category.name}
            </span>
          </Link>
          {hasChildren && (
            <button
              onClick={() => onToggleCategory(category.id)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isExpanded ? "Masquer les sous-catégories" : "Afficher les sous-catégories"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-200" />
              )}
            </button>
          )}
        </div>

        {/* Child Categories */}
        {isExpanded && hasChildren && (
          <div className="mt-1 space-y-1">
            {childCategories.map((childCategory) => (
              <CategoryItem
                key={childCategory.id}
                category={childCategory}
                allCategories={allCategories}
                level={level + 1}
                expandedCategories={expandedCategories}
                onToggleCategory={onToggleCategory}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const mainMenuItems = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/categories', icon: Grid3X3, label: 'Catégories' },
    { path: '/search', icon: Search, label: 'Recherche' },
    { path: '/cart', icon: ShoppingCart, label: 'Panier', badge: cartItemsCount },
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  const secondaryMenuItems = [
    { path: '/orders', icon: Package, label: 'Mes Commandes' },
    { path: '/favorites', icon: Heart, label: 'Favoris' },
    { path: '/contact', icon: MessageCircle, label: 'Contact' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
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
            <div className="space-y-1">
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  allCategories={allCategories}
                  level={0}
                  expandedCategories={expandedCategories}
                  onToggleCategory={toggleCategory}
                  onClose={onClose}
                />
              ))}
            </div>
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