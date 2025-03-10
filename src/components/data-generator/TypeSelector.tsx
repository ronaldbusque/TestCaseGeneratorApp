import { useState } from 'react';
import { fakerCategories } from '@/lib/data/faker-categories';
import { MagnifyingGlassIcon as SearchIcon } from '@heroicons/react/24/outline';

interface TypeSelectorProps {
  selectedTypes: string[];
  onSelectType: (types: string[]) => void;
}

export function TypeSelector({ selectedTypes, onSelectType }: TypeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const filteredTypes = fakerCategories.flatMap(category => 
    category.types.filter(type => 
      type.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(type => ({
      ...type,
      category: category.name // Always use the parent category name
    }))
  );
  
  const filteredByCategory = activeCategory === 'All' 
    ? filteredTypes 
    : filteredTypes.filter(type => type.category === activeCategory);
  
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-white/10">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white mb-2">Choose a Type</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Find Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900/80 border border-white/10 text-white rounded-xl 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
          />
          <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
        <div className="border-b border-white/10">
          {fakerCategories.map(category => (
            <button
              key={category.name}
              className={`px-4 py-2 text-sm font-medium text-left w-full transition-colors
                        ${activeCategory === category.name 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-300 hover:bg-slate-700'}`}
              onClick={() => setActiveCategory(category.name)}
            >
              {category.name} ({category.types.length})
            </button>
          ))}
        </div>
        
        <div className="p-2">
          {filteredByCategory.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              No types found matching your criteria
            </div>
          ) : (
            filteredByCategory.map(type => (
              <button
                key={type.name}
                className={`px-3 py-2 text-sm font-medium rounded-lg text-left w-full my-1 transition-colors
                          ${selectedTypes.includes(type.name)
                            ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50'
                            : 'text-gray-300 hover:bg-slate-700 border border-transparent'}`}
                onClick={() => {
                  if (selectedTypes.includes(type.name)) {
                    onSelectType(selectedTypes.filter(t => t !== type.name));
                  } else {
                    onSelectType([...selectedTypes, type.name]);
                  }
                }}
              >
                {type.name}
                <div className="text-xs text-gray-400 mt-1">{type.description || ''}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 