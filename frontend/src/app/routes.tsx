import { createBrowserRouter } from 'react-router';
import { Root } from './pages/Root';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { ModelsPage } from './pages/ModelsPage';
import { ComparePage } from './pages/ComparePage';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <h2 className="text-foreground mb-2">Page Not Found</h2>
      <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: ChatPage },
      { path: 'chat/:id', Component: ChatPage },
      { path: 'compare', Component: ComparePage },
      { path: 'settings', Component: SettingsPage },
      { path: 'models', Component: ModelsPage },
      { path: '*', Component: NotFound },
    ],
  },
]);