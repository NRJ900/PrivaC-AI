import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { useUIStore } from '../store/ui.store';

export default function App() {
  const theme = useUIStore(s => s.theme);

  // Apply theme on mount and change
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return <RouterProvider router={router} />;
}
