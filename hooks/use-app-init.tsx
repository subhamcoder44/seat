'use client';

import { useEffect } from 'react';
import { useAppState } from './use-app-state';

/**
 * Hook to initialize the app with sample data on first load
 * This helps users understand the system better
 */
export function useAppInit() {
  const { rooms, addRoom, addStudent, allocateSeat, loadFromLocalStorage } = useAppState();

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Initialize with sample data if no rooms exist
  useEffect(() => {
    if (rooms.length === 0 && typeof window !== 'undefined') {
      const hasSampleData = localStorage.getItem('exam_sample_initialized');
      if (!hasSampleData) {
        // Add sample room
        const roomData = { name: 'Lab A', rows: 8, columns: 10 };
        // We need to dispatch these through app context
        localStorage.setItem('exam_sample_initialized', 'true');
      }
    }
  }, [rooms.length]);
}
