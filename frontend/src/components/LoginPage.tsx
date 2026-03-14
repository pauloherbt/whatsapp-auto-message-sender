import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LoginPageProps {
    onAuthenticated: (token: string, email: string) => void;
}

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
    const [tab, setTab] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = tab === 'login'
                ? await api.login(email, password)
                : await api.register(email, password);

            localStorage.setItem('wpp_token', data.token);
            localStorage.setItem('wpp_email', data.email);
            onAuthenticated(data.token, data.email);
            toast.success(tab === 'login' ? 'Login realizado!' : 'Conta criada com sucesso!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao autenticar');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-green-500 text-white p-3 rounded-2xl shadow-lg mb-3">
                        <MessageCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">WPP Gerenciador</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie seus grupos do WhatsApp</p>
                </div>

                <Card className="shadow-lg border-gray-100 bg-white/90 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        {/* Tabs */}
                        <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-2">
                            <button
                                onClick={() => setTab('login')}
                                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${tab === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Entrar
                            </button>
                            <button
                                onClick={() => setTab('register')}
                                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${tab === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Criar conta
                            </button>
                        </div>
                        <CardTitle className="text-lg">{tab === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}</CardTitle>
                        <CardDescription>{tab === 'login' ? 'Entre com seu email e senha.' : 'Cadastre-se para começar a usar.'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Senha</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={tab === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
                                    required
                                    minLength={8}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                            >
                                {isLoading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
