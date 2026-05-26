import { useState, useCallback, useMemo } from 'react';

export function useMapFilters() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedArchStyle, setSelectedArchStyle] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedUhiCells, setSelectedUhiCells] = useState<string[]>([]);

  const handleTypeToggle = useCallback((val: string) => {
    setSelectedTypes((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }, []);

  const handleDistrictToggle = useCallback((val: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }, []);

  const handleReset = useCallback(() => {
    setSelectedTypes([]);
    setSelectedDistricts([]);
    setSelectedArchStyle('');
    setSelectedCompany('');
    setSelectedUhiCells([]);
  }, []);

  const activeCount = useMemo(
    () =>
      selectedTypes.length +
      selectedDistricts.length +
      (selectedArchStyle ? 1 : 0) +
      (selectedCompany ? 1 : 0),
    [selectedTypes, selectedDistricts, selectedArchStyle, selectedCompany]
  );

  return {
    selectedTypes,
    setSelectedTypes,
    selectedDistricts,
    setSelectedDistricts,
    selectedArchStyle,
    setSelectedArchStyle,
    selectedCompany,
    setSelectedCompany,
    selectedUhiCells,
    setSelectedUhiCells,
    handleTypeToggle,
    handleDistrictToggle,
    handleReset,
    activeCount,
  };
}
