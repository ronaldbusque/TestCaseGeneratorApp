import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { fakerCategories } from '@/lib/data/faker-categories';

// Define type for a faker type with category information
interface TypeWithCategory {
  name: string;
  description?: string;
  category: string;
}

interface TypeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (typeName: string) => void;
}

export function TypeSelectionDialog({ 
  isOpen, 
  onClose, 
  onSelectType 
}: TypeSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Reset search and category when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setActiveCategory('All');
    }
  }, [isOpen]);
  
  // Filter types based on search term and active category
  const getFilteredTypes = (): TypeWithCategory[] => {
    // Start with an empty array for results
    let results: TypeWithCategory[] = [];
    
    // Create a Set to track unique type names and avoid duplicates
    const addedTypes = new Set<string>();
    
    // Process categories based on selected category or search
    if (activeCategory === 'All') {
      // Skip the first "All" category since it's just a container
      fakerCategories.slice(1).forEach(category => {
        category.types.forEach(type => {
          // Only add if it passes search filter and not already added
          if (!addedTypes.has(type.name) && 
              (!searchTerm.trim() || 
               type.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
               (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase())))) {
            results.push({
              ...type,
              category: category.name
            });
            addedTypes.add(type.name);
          }
        });
      });
    } else {
      // For a specific category, just get types from that category
      const category = fakerCategories.find(c => c.name === activeCategory);
      if (category) {
        category.types.forEach(type => {
          // Only add if it passes search filter
          if (!searchTerm.trim() || 
              type.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase()))) {
            results.push({
              ...type,
              category: category.name
            });
          }
        });
      }
    }
    
    // Sort results alphabetically by name for consistency
    return results.sort((a, b) => a.name.localeCompare(b.name));
  };
  
  const filteredTypes = getFilteredTypes();
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-xl bg-slate-900 shadow-xl transition-all flex flex-col">
                <Dialog.Title
                  as="div"
                  className="flex justify-between items-center p-4 border-b border-slate-700"
                >
                  <h3 className="text-xl font-medium text-white">Choose a Type</h3>
                  <div className="flex items-center space-x-2">
                    <div className="relative w-64">
                      <input
                        type="text"
                        placeholder="Find Type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6 text-slate-300" />
                    </button>
                  </div>
                </Dialog.Title>
                
                <div className="flex h-[500px] overflow-hidden">
                  {/* Left Sidebar - Categories */}
                  <div className="w-48 min-w-48 overflow-y-auto border-r border-slate-700 bg-slate-800">
                    {fakerCategories.map(category => (
                      <button
                        key={category.name}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          activeCategory === category.name
                            ? 'bg-blue-700 text-white font-medium'
                            : 'text-slate-300 hover:bg-slate-700'
                        }`}
                        onClick={() => setActiveCategory(category.name)}
                      >
                        {category.name} {category.types.length > 0 && `(${category.types.length})`}
                      </button>
                    ))}
                  </div>
                  
                  {/* Right Content - Type Grid */}
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="grid grid-cols-3 gap-2">
                      {filteredTypes.length === 0 ? (
                        <div className="col-span-3 p-4 text-center text-slate-400">
                          No types found matching your criteria
                        </div>
                      ) : (
                        filteredTypes.map(type => (
                          <button
                            key={type.name}
                            className="bg-slate-800 hover:bg-slate-700 p-4 rounded-lg text-left transition-colors border border-slate-700 hover:border-blue-500"
                            onClick={() => {
                              onSelectType(type.name);
                              onClose();
                            }}
                          >
                            <h4 className="text-white font-medium">{type.name}</h4>
                            <p className="text-xs text-slate-400 mt-1">
                              {type.description || ''}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 