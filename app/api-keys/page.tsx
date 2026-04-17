"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { 
  Plus, 
  Copy, 
  Check, 
  Loader2, 
  Trash2, 
  ShieldCheck, 
  Key, 
  Eye, 
  EyeOff,
  RefreshCw,
  Search,
  MoreVertical
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createApiKey, getApiKeys } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        fetchKeys();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchKeys = async () => {
    setLoading(true);
    const { data } = await getApiKeys("default");
    if (data) setKeys(data);
    setLoading(false);
  };

  const handleCreateKey = async () => {
    if (!user) return;
    setCreating(true);
    const { api_key } = await createApiKey(
      user.displayName || user.email?.split('@')[0] || "User",
      user.email || "unknown@cosavu.com",
      "default"
    );

    if (api_key) {
      setNewKey(api_key);
      fetchKeys();
    }
    setCreating(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading && keys.length === 0) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center text-muted-foreground text-sm">
        Syncing Credentials...
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background text-foreground uppercase tracking-tight">
        <AppSidebar />
        <SidebarInset className="flex h-screen w-full flex-col shadow-none overflow-y-auto relative">
          
          <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4 sticky top-0 z-50">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border mx-2" />
            <h1 className="text-sm font-medium text-muted-foreground">System Administration / API Keys</h1>
          </header>

          <main className="flex-1 p-6 lg:p-10 w-full max-w-7xl mx-auto flex flex-col gap-10">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tighter flex items-center gap-3">
                  Production Integration Keys
                  <ShieldCheck className="size-6 text-muted-foreground/30" strokeWidth={1.5} />
                </h2>
                <p className="text-muted-foreground text-sm font-medium max-w-md">
                  Securely authenticate machine-to-machine requests. Tokens are scoped to your workspace by default.
                </p>
              </div>
              <Button 
                onClick={handleCreateKey} 
                className="h-12 px-6 rounded-xl bg-foreground text-background font-bold gap-2 active:scale-95 transition-all"
                disabled={creating}
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Issue New Production Key
              </Button>
            </div>

            {/* New Key Alert */}
            {newKey && (
              <div className="bg-foreground text-background rounded-2xl p-8 relative overflow-hidden group">
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-400" />
                    <span className="text-[10px] font-bold tracking-[0.2em]">CREDENTIAL ISSUED SUCCESSFULLY</span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm opacity-60 leading-relaxed max-w-lg">
                      Save this key immediately. For security reasons, <span className="underline underline-offset-4 decoration-emerald-400/50">we cannot show this to you again</span> after you leave this page.
                    </p>
                    <div className="flex items-center gap-3 bg-background/10 backdrop-blur-md p-4 rounded-xl border border-background/20 group-hover:border-background/40 transition-colors">
                      <code className="flex-1 font-mono text-sm break-all select-all font-bold tracking-wider">
                        {newKey}
                      </code>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="hover:bg-background/20 text-background h-10 w-10 shrink-0"
                        onClick={() => copyToClipboard(newKey, 'new')}
                      >
                        {copiedId === 'new' ? <Check className="size-4" /> : <Copy className="size-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-background/5 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
              </div>
            )}

            {/* Keys List */}
            <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3 bg-background border rounded-lg px-3 py-1.5 w-full max-w-sm">
                  <Search className="size-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search by label or email..." 
                    className="h-6 border-none focus-visible:ring-0 text-xs p-0 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="sm" className="text-[10px] font-bold h-8">Filters</Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="size-4 text-muted-foreground" /></Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/20 text-[10px] font-bold tracking-widest text-muted-foreground border-b border-border/50 uppercase">
                      <th className="px-6 py-4">Provisioned To</th>
                      <th className="px-6 py-4">Token Preview</th>
                      <th className="px-6 py-4">Last Active</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4 text-right">Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {keys.length > 0 ? keys.map((key) => (
                      <tr key={key.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground/50 font-bold text-lg select-none">
                              {key.user_name?.charAt(0) || "U"}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{key.user_name}</span>
                              <span className="text-[10px] text-muted-foreground/50 font-bold lowercase">{key.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 group/key">
                            <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-muted-foreground/80 font-bold">
                              {showKeys[key.id] ? key.key_string : `${key.key_string?.substring(0, 10)}****************`}
                            </code>
                            <div className="flex opacity-0 group-hover/key:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground"
                                onClick={() => toggleKeyVisibility(key.id)}
                              >
                                {showKeys[key.id] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground"
                                onClick={() => copyToClipboard(key.key_string, key.id)}
                              >
                                {copiedId === key.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <span className="text-[11px] font-bold text-muted-foreground/40 font-mono tracking-tight uppercase italic underline underline-offset-2">Never Used</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {new Date(key.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                             <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                             <div className="size-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground/20">
                                <Key className="size-8" />
                             </div>
                             <div className="space-y-1">
                                <p className="text-sm font-semibold">No active integration keys</p>
                                <p className="text-xs text-muted-foreground">Issue a new key to begin indexing from your environment.</p>
                             </div>
                             <Button onClick={handleCreateKey} variant="outline" className="mt-4 rounded-xl font-bold h-10 px-6">Issue Key</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
