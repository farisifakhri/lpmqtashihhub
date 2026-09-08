import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
