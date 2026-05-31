import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2, GitMerge, MessageSquareCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';

const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left side - Visuals */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-gray-900 text-white relative overflow-hidden">
        {/* Abstract Gradient Mesh Background */}
        <div className="absolute inset-0 opacity-20 dark:opacity-40 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/40 blur-[120px]" />
          <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/30 blur-[100px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[50%] rounded-full bg-purple-500/20 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md">
              <Code2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">DevSync</span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Code reviews,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              supercharged.
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md font-medium leading-relaxed">
            Collaborate in real-time, leave inline comments, and get instant feedback from our AI Review Bot.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="relative z-10 flex gap-6 text-sm font-medium text-gray-500"
        >
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-gray-400" />
            <span>Real-time Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquareCode className="w-5 h-5 text-gray-400" />
            <span>Inline Comments</span>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Subtle background glow for light mode */}
        <div className="absolute inset-0 lg:hidden opacity-10 pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-[70%] h-[70%] rounded-full bg-primary blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl border-white/20 dark:border-white/10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
            <CardHeader className="space-y-3 text-center pt-8 pb-6">
              <div className="flex justify-center mb-2 lg:hidden">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Code2 className="w-10 h-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400 text-base">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="space-y-5">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50"
                  >
                    {error}
                  </motion.div>
                )}
                <Button
                  className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
