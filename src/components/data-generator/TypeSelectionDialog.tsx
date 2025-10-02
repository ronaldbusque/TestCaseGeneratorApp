'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { fakerCategories } from '@/lib/data/faker-categories';
import { fakerTypeDefinitions } from '@/lib/data/faker-type-definitions';
import { rankTypes, splitHighlight, type SearchableType } from '@/lib/data-generator/typeSearch';

const RECENT_TYPES_STORAGE_KEY = 'generator_recent_types';
const MAX_RECENT_TYPES = 8;

interface TypeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (typeName: string) => void;
}

export function TypeSelectionDialog({ isOpen, onClose, onSelectType }: TypeSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [recentTypes, setRecentTypes] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const loadRecentTypes = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(RECENT_TYPES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentTypes(parsed.filter((value): value is string => typeof value === 'string'));
        }
      }
    } catch (error) {
      console.warn('[TypeSelectionDialog] failed to read recent types', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setActiveCategory('All');
      setHighlightedIndex(0);
      loadRecentTypes();
    }
  }, [isOpen, loadRecentTypes]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm, activeCategory]);

  const definedTypeNames = useMemo(() => new Set(Object.keys(fakerTypeDefinitions)), []);

  const allTypes = useMemo(() => {
    const types: SearchableType[] = [];
    fakerCategories.forEach((category) => {
      if (category.name === 'All') {
        return;
      }
      category.types.forEach((type) => {
        if (definedTypeNames.has(type.name)) {
          types.push({
            name: type.name,
            description: type.description,
            category: category.name,
          });
        }
      });
    });
    return types;
  }, [definedTypeNames]);

  const filteredTypes = useMemo(
    () => rankTypes({ types: allTypes, searchTerm, category: activeCategory }),
    [allTypes, searchTerm, activeCategory]
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const definedTypes = new Set(allTypes.map((type) => type.name));
    fakerCategories.forEach((category) => {
      if (category.name === 'All') {
        counts[category.name] = definedTypes.size;
      } else {
        counts[category.name] = category.types.filter((type) => definedTypes.has(type.name)).length;
      }
    });
    return counts;
  }, [allTypes]);

  const handleSelect = (typeName: string) => {
    setRecentTypes((prev) => {
      const next = [typeName, ...prev.filter((value) => value !== typeName)].slice(0, MAX_RECENT_TYPES);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECENT_TYPES_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
    onSelectType(typeName);
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (filteredTypes.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredTypes.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredTypes.length) % filteredTypes.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const type = filteredTypes[highlightedIndex];
      if (type) {
        handleSelect(type.name);
      }
    }
  };

  const clearRecent = () => {
    setRecentTypes([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(RECENT_TYPES_STORAGE_KEY);
    }
  };

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
                        onKeyDown={handleKeyDown}
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
                  <div className="w-48 min-w-48 overflow-y-auto border-r border-slate-700 bg-slate-800">
                    {fakerCategories
                      .filter((category) => category.name === 'All' || typeCounts[category.name] > 0)
                      .map((category) => (
                        <button
                          key={category.name}
                          className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                            activeCategory === category.name
                              ? 'bg-blue-700 text-white font-medium'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                          onClick={() => setActiveCategory(category.name)}
                        >
                          {category.name} {typeCounts[category.name] > 0 && `(${typeCounts[category.name]})`}
                        </button>
                      ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-3">
                    {recentTypes.length > 0 && !searchTerm.trim() && (
                      <div className="border border-slate-700/70 rounded-lg bg-slate-800/60 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                            Recently Used
                          </span>
                          <button
                            className="text-xs text-slate-400 hover:text-slate-200"
                            onClick={clearRecent}
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentTypes.map((typeName) => (
                            <button
                              key={typeName}
                              className="px-3 py-1.5 text-xs rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
                              onClick={() => handleSelect(typeName)}
                            >
                              {typeName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-slate-400">
                        {filteredTypes.length} {filteredTypes.length === 1 ? 'type' : 'types'}
                      </span>
                      {searchTerm.trim() && (
                        <span className="text-xs text-slate-500">
                          Showing best matches for “{searchTerm}”
                        </span>
                      )}
                    </div>

                    <div
                      className="grid grid-cols-3 gap-2"
                      role="listbox"
                      aria-activedescendant={filteredTypes[highlightedIndex]?.name ?? undefined}
                    >
                      {filteredTypes.length === 0 ? (
                        <div className="col-span-3 p-4 text-center text-slate-400">
                          No types found matching your criteria
                        </div>
                      ) : (
                        filteredTypes.map((type, index) => {
                          const isHighlighted = index === highlightedIndex;
                          const nameSegments = splitHighlight(type.name, searchTerm);
                          const descriptionSegments = splitHighlight(type.description ?? '', searchTerm);
                          return (
                            <button
                              key={type.name}
                              className={`bg-slate-800 p-4 rounded-lg text-left transition-colors border ${
                                isHighlighted
                                  ? 'border-blue-500 bg-slate-700/70'
                                  : 'border-slate-700 hover:border-blue-500 hover:bg-slate-700/60'
                              }`}
                              onMouseEnter={() => setHighlightedIndex(index)}
                              onClick={() => handleSelect(type.name)}
                              role="option"
                              aria-selected={isHighlighted}
                            >
                              <h4 className="text-white font-medium">
                                {nameSegments.map((segment, segmentIndex) => (
                                  <span
                                    key={`${type.name}-name-${segmentIndex}`}
                                    className={segment.highlighted ? 'text-blue-300' : undefined}
                                  >
                                    {segment.text}
                                  </span>
                                ))}
                              </h4>
                              <p className="text-xs text-slate-400 mt-1 min-h-[2.5rem]">
                                {descriptionSegments.map((segment, segmentIndex) => (
                                  <span
                                    key={`${type.name}-desc-${segmentIndex}`}
                                    className={segment.highlighted ? 'text-blue-300' : undefined}
                                  >
                                    {segment.text}
                                  </span>
                                ))}
                              </p>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                                {type.category}
                              </span>
                            </button>
                          );
                        })
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
