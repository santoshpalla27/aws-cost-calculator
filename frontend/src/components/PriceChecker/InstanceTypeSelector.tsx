import React, { useState, useMemo } from 'react';
import { Combobox } from '@headlessui/react';
import {
  ChevronUpDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useInstanceTypes } from '../../hooks/usePricing';
import { Loading } from '../common/Loading';
import type { InstanceTypeInfo } from '../../types';

interface InstanceTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  region: string;
}

export const InstanceTypeSelector: React.FC<InstanceTypeSelectorProps> = ({
  value,
  onChange,
  region,
}) => {
  const [query, setQuery] = useState('');
  const { data, isLoading, error } = useInstanceTypes(region);

  const filteredTypes = useMemo(() => {
    if (!data?.instance_types) return [];
    
    const searchLower = query.toLowerCase();
    return data.instance_types.filter((type) =>
      type.instance_type.toLowerCase().includes(searchLower)
    );
  }, [data?.instance_types, query]);

  const selectedType = data?.instance_types.find(
    (t) => t.instance_type === value
  );

  if (isLoading) {
    return (
      <div>
        <label className="label">Instance Type</label>
        <div className="card p-4 flex items-center justify-center">
          <Loading text="Loading instance types..." size="sm" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <label className="label">Instance Type</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., t3.micro"
          className="input"
        />
        <p className="text-sm text-accent-red mt-1">
          Failed to load instance types: {error.message}
        </p>
      </div>
    );
  }

  return (
    <Combobox value={value} onChange={onChange}>
      <label className="label">Instance Type</label>
      <div className="relative mt-1">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-dark-900 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
          <Combobox.Input
            className="input pr-10"
            displayValue={(instanceType: string) => instanceType}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-dark-400"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-dark-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
          {filteredTypes.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none px-4 py-2 text-dark-400">
              No instance types found.
            </div>
          ) : (
            filteredTypes.slice(0, 100).map((type) => (
              <Combobox.Option
                key={type.instance_type}
                className={({ active }) =>
                  clsx(
                    'relative cursor-default select-none py-2 pl-10 pr-4',
                    active ? 'bg-dark-700 text-dark-100' : 'text-dark-300'
                  )
                }
                value={type.instance_type}
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={clsx(
                        'block truncate',
                        selected ? 'font-medium' : 'font-normal'
                      )}
                    >
                      {type.instance_type}
                    </span>
                    {selected ? (
                      <span
                        className={clsx(
                          'absolute inset-y-0 left-0 flex items-center pl-3',
                          active ? 'text-white' : 'text-accent-blue'
                        )}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>

      {selectedType && (
        <div className="mt-3 text-sm text-dark-400 p-3 card">
          <div className="grid grid-cols-2 gap-2">
            <span>
              vCPU:{' '}
              <span className="font-medium text-dark-100">
                {selectedType.vcpu || 'N/A'}
              </span>
            </span>
            <span>
              Memory:{' '}
              <span className="font-medium text-dark-100">
                {selectedType.memory_gib?.toFixed(1) || 'N/A'} GiB
              </span>
            </span>
            <span>
              Storage:{' '}
              <span className="font-medium text-dark-100">
                {selectedType.storage || 'EBS'}
              </span>
            </span>
          </div>
        </div>
      )}
    </Combobox>
  );
};