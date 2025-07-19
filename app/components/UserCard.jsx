"use client";
import { User, Mail, Phone, MapPin } from 'lucide-react';

export default function UserCard({ user }) {
  if (!user) return null;
  
  return (
    <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {user.name || 'Unknown User'}
          </h3>
          
          <div className="mt-2 space-y-2">
            {user.email && user.email !== 'Not provided' && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            
            {user.phone && user.phone !== 'Not provided' && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}
            
            {user.address && user.address !== 'Not provided' && (
              <div className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{user.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
