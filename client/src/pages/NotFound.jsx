import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card padding="lg" className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          404
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button onClick={() => navigate('/')} size="lg">
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </Button>
      </Card>
    </div>
  );
}
