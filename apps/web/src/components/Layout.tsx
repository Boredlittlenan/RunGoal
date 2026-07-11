import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="app-shell">
      <main className="app-shell__content safe-area-top">
        <div className="page-frame">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
