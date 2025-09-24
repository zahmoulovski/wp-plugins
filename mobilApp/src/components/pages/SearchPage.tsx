import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'react-bootstrap-icons';
import { Product } from '../../types';
import { api } from '../../services/api';
import { ProductCard } from '../common/ProductCard';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface SearchPageProps {
  onProductClick: (product: Product) => void;
}

export function SearchPage({ onProductClick }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [allProductNames, setAllProductNames] = useState<string[]>([]);

  // Load product names from the text file
  useEffect(() => {
    const loadProductNames = async () => {
      try {
        const response = await fetch('/src/contexts/product.txt');
        const text = await response.text();
        const names = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        setAllProductNames(names);
      } catch (error) {
        console.error('Error loading product names:', error);
      }
    };
    
    loadProductNames();
  }, []);

  // Generate suggestions based on query
  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = allProductNames
      .filter(name => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8); // Limit to 8 suggestions
    
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedSuggestionIndex(-1);
  }, [query, allProductNames]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchProducts = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const results = await api.searchProducts(searchQuery);
      setProducts(results);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(query);
  };

  const clearSearch = () => {
    setQuery('');
    setProducts([]);
    setHasSearched(false);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    searchProducts(suggestion);
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Rechercher des Produits
      </h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder="Rechercher des produits..."
            className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          
          {/* Autocomplete suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    index === selectedSuggestionIndex
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                      : 'text-gray-900 dark:text-white'
                  } ${index === 0 ? 'rounded-t-xl' : ''} ${
                    index === suggestions.length - 1 ? 'rounded-b-xl' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <Search className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : hasSearched ? (
        products.length > 0 ? (
          <>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {products.length} résultats pour "{query}"
            </p>
            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onProductClick={onProductClick}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucun produit trouvé pour "{query}"
            </p>
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Recherchez des produits par nom ou description
          </p>
        </div>
      )}
    </div>
  );
}