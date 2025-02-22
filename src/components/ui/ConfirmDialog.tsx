import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel'
}: ConfirmDialogProps) {
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-blue-100">
                      {title}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-blue-200">{message}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    onClick={onClose}
                    className="bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-blue-200 hover:text-blue-100"
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className="bg-red-500/20 hover:bg-red-500/30 border-red-500/20 hover:border-red-500/30 text-red-200 hover:text-red-100"
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 