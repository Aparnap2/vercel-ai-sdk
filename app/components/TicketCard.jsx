"use client";

export default function TicketCard({ ticket }) {
  if (!ticket) return null;
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Ticket #{ticket.id}
          </h3>
        </div>
        {ticket.status && (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
            {ticket.status}
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Issue Description
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-200 leading-relaxed">
            {ticket.issue || 'No description provided.'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Created
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-200">
              {formatDate(ticket.created_at || ticket.createdAt)}
            </div>
          </div>
          
          {ticket.customer && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Customer
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-200">
                {ticket.customer.name || 'Unknown'}
              </div>
              {ticket.customer.email && (
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {ticket.customer.email}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
