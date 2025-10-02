'use client';

import { Fragment, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

import { SCHEMA_TEMPLATES, type SchemaTemplate } from '@/lib/data-generator/templates';

interface TemplateSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (template: SchemaTemplate) => void;
}

interface TemplateGroup {
  name: string;
  templates: SchemaTemplate[];
}

const groupTemplates = (): TemplateGroup[] => {
  const groups = new Map<string, SchemaTemplate[]>();
  SCHEMA_TEMPLATES.forEach((template) => {
    if (!groups.has(template.category)) {
      groups.set(template.category, []);
    }
    groups.get(template.category)!.push(template);
  });
  return Array.from(groups.entries())
    .map(([name, templates]) => ({ name, templates }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export function TemplateSelectionDialog({ isOpen, onClose, onApply }: TemplateSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const groupedTemplates = useMemo(() => groupTemplates(), []);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return groupedTemplates;
    }

    return groupedTemplates
      .map((group) => ({
        ...group,
        templates: group.templates.filter((template) =>
          template.name.toLowerCase().includes(term) ||
          template.description.toLowerCase().includes(term)
        ),
      }))
      .filter((group) => group.templates.length > 0);
  }, [groupedTemplates, searchTerm]);

  const handleApply = (template: SchemaTemplate) => {
    onApply(template);
    onClose();
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-slate-900 shadow-xl transition-all">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Squares2X2Icon className="h-5 w-5 text-blue-300" />
                    <Dialog.Title className="text-lg font-semibold text-white">Template Library</Dialog.Title>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search templates..."
                      className="w-64 bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={onClose}
                      className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6 text-slate-300" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[520px] overflow-y-auto space-y-6 p-5">
                  {filteredGroups.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">
                      No templates match “{searchTerm}”.
                    </div>
                  ) : (
                    filteredGroups.map((group) => (
                      <section key={group.name} className="space-y-3">
                        <header>
                          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                            {group.name}
                          </h3>
                          <div className="h-px bg-slate-700 mt-1" />
                        </header>
                        <div className="grid md:grid-cols-2 gap-3">
                          {group.templates.map((template) => (
                            <article
                              key={template.key}
                              className="border border-slate-700 rounded-lg bg-slate-800/60 hover:border-blue-500 transition-colors"
                            >
                              <div className="p-4 space-y-3">
                                <div>
                                  <h4 className="text-white font-semibold text-sm">{template.name}</h4>
                                  <p className="text-xs text-slate-400 mt-1">{template.description}</p>
                                </div>
                                <ul className="text-xs text-slate-300 space-y-1">
                                  {template.fields.map((field) => (
                                    <li key={field.name} className="flex justify-between gap-2">
                                      <span className="font-medium text-slate-200">{field.name}</span>
                                      <span className="text-slate-400">{field.type}</span>
                                    </li>
                                  ))}
                                </ul>
                                <button
                                  onClick={() => handleApply(template)}
                                  className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 transition-colors"
                                >
                                  Apply Template
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
