import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Unsubscribe() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    const userId = searchParams.get('user');
    const type = searchParams.get('type');
    const channel = searchParams.get('channel');

    useEffect(() => {
        const unsubscribe = async () => {
            if (!userId || !type) {
                setStatus('error');
                setMessage('Invalid unsubscribe link.');
                return;
            }

            try {
                await api.post('/subscriptions/public/unsubscribe', {
                    user_id: parseInt(userId),
                    subscription_type: type,
                    channel: channel || 'email'
                });
                setStatus('success');
            } catch (error) {
                console.error('Unsubscribe error:', error);
                setStatus('error');
                setMessage('Failed to process unsubscription. Please try again or contact support.');
            }
        };

        unsubscribe();
    }, [userId, type, channel]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Unsubscription</CardTitle>
                    <CardDescription>Managing your notifications</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-6">
                    {status === 'loading' && (
                        <div className="text-center">
                            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                            <p>Processing your request...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center text-green-600">
                            <CheckCircle className="h-16 w-16 mx-auto mb-4" />
                            <h3 className="text-xl font-medium mb-2">Successfully Unsubscribed</h3>
                            <p className="text-gray-600">
                                You have been unsubscribed from this type of notification.
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center text-red-600">
                            <XCircle className="h-16 w-16 mx-auto mb-4" />
                            <h3 className="text-xl font-medium mb-2">Error</h3>
                            <p className="text-gray-600">{message}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-center">
                    <Link to="/">
                        <Button variant="outline">Return to Home</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
