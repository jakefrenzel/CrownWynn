"use client";

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from '@/context/UserContext';

export default function MinesPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  // Show loading state if user is not authenticated (before redirect)
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        Redirecting to login...
      </div>
    );
  }

  // Main page content for authenticated users
  return (
    <div>
      <Header />
      <Sidebar />
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: 'calc(100vh - 60px)', // Account for header height
        backgroundColor: '#1a2c38',
        color: '#fff',
        fontFamily: 'Poppins, sans-serif'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          Welcome to Mines, {user.username}!
        </h1>
        
        <p style={{ fontSize: '1.2rem', textAlign: 'center', maxWidth: '600px' }}>
          This is a protected page that only authenticated users can access.
          Your authentication is working correctly!
        </p>
        
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem 2rem', 
          backgroundColor: '#2b78ca', 
          borderRadius: '6px' 
        }}>
          <p>🎮 Mines game content goes here...</p>
        </div>
      </div>
    </div>
  );
}
