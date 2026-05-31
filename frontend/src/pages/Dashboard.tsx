import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { type RootState } from '../store/store';
import { logout } from '../firebase';
import { fetchRooms, createRoom, deleteRoom } from '../services/api';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, Plus, Users, Code, Activity, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '../components/ThemeToggle';

interface Room {
  id: string;
  title: string;
  description: string;
  status: string;
  members: string[];
}

const Dashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomTitle) return;
    setIsCreating(true);
    try {
      const newRoom = await createRoom(newRoomTitle, newRoomDesc);
      setRooms([newRoom, ...rooms]);
      setIsDialogOpen(false);
      setNewRoomTitle('');
      setNewRoomDesc('');
    } catch (error) {
      console.error("Failed to create room", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;
    try {
      await deleteRoom(roomId);
      setRooms(rooms.filter(room => room.id !== roomId));
    } catch (error) {
      console.error("Failed to delete room", error);
      alert("Failed to delete room. You may not be the owner.");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      case 'merged': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/50';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-400 border-gray-200 dark:border-gray-700/50';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 px-6 py-8 md:px-12 md:py-10 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-4 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-white dark:border-gray-800 shadow-md">
              <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {user?.displayName || 'Developer'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2 rounded-full hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Sign Out</span>
            </Button>
          </div>
        </header>

        <main>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
                Overview <Activity className="w-8 h-8 text-primary opacity-50" />
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Your collaborative workspaces</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95">
                    <Plus className="w-5 h-5 mr-2" />
                    New Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Create Workspace</DialogTitle>
                    <DialogDescription>
                      Start a new real-time code review session.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5 py-6">
                    <div className="grid gap-2">
                      <Label htmlFor="title" className="text-gray-700 dark:text-gray-300">Workspace Title</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g. Authentication Flow Fixes" 
                        className="bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800 focus:ring-primary"
                        value={newRoomTitle}
                        onChange={(e) => setNewRoomTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Description (Optional)</Label>
                      <Input 
                        id="description" 
                        placeholder="What are we reviewing today?" 
                        className="bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800 focus:ring-primary"
                        value={newRoomDesc}
                        onChange={(e) => setNewRoomDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" className="rounded-full" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateRoom} className="rounded-full px-6 shadow-md" disabled={!newRoomTitle || isCreating}>
                      {isCreating ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : rooms.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="bg-white/50 dark:bg-gray-900/30 p-16 rounded-3xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm text-center flex flex-col items-center justify-center max-w-2xl mx-auto mt-12"
            >
              <div className="bg-primary/10 p-6 rounded-3xl mb-6 ring-1 ring-primary/20">
                <Code className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">It's quiet in here</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm text-lg">
                Create a workspace, invite your team, and start reviewing code in real-time.
              </p>
              <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-transform" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-5 h-5 mr-2" /> Start Collaborating
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {rooms.map(room => (
                <motion.div key={room.id} variants={itemVariants}>
                  <Card 
                    className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col group border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/40 backdrop-blur-md hover:-translate-y-1 hover:border-primary/30 dark:hover:border-primary/30" 
                    onClick={() => navigate(`/room/${room.id}`)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getStatusColor(room.status)}`}>
                          {room.status}
                        </span>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => handleDeleteRoom(e, room.id)}
                            className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all text-gray-400 z-20"
                            title="Delete Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                            <Users className="w-4 h-4 text-gray-500 group-hover:text-primary" />
                          </div>
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">{room.title}</CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[40px] text-gray-500 dark:text-gray-400 mt-2">
                        {room.description || 'No description provided'}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-4 border-t border-gray-100 dark:border-gray-800/50 mt-auto flex justify-between items-center">
                      <div className="flex items-center -space-x-2">
                        {/* Mock avatar stack for members */}
                        {room.members.slice(0,3).map((_, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-500 z-10">
                            {i+1}
                          </div>
                        ))}
                        {room.members.length > 3 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-500 z-0 pl-1">
                            +{room.members.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1">
                        Enter Room <span className="text-lg leading-none">→</span>
                      </span>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
