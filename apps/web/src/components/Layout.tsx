import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto safe-area-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
