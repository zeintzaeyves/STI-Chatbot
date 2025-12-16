"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Users = () => {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to chatbot
    router.push('/users/chatbot');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to chatbot...</p>
      </div>
    </div>
  );
};

export default Users;