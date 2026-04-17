"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Copy, EyeOff, PlayCircle, Terminal, ChevronDown, Sun, Moon, Check, RefreshCw, Eye, Database, KeyRound, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createApiKey } from "@/lib/supabase";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState("csvu_k8y" + Math.random().toString(36).substring(7) + "_v2");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("NodeJS");
  const [selectedModel, setSelectedModel] = useState("cosavu-medium");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const generateNewKey = async () => {
    if (!user) return;
    const { api_key } = await createApiKey(
      user.displayName || user.email?.split('@')[0] || "User",
      user.email || "unknown@cosavu.com",
      "default"
    );
    if (api_key) {
      setApiKey(api_key);
      setCopied(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading Cosavu...
      </div>
    );
  }

  const codeSnippets: Record<string, string> = {
    NodeJS: `async function queryCosavu(prompt) {
  const response = await fetch('https://api.cosavu.com/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': '${apiKey}'
    },
    body: JSON.stringify({
      query: prompt,
      model: "${selectedModel}",
      system: "car-1",
      collection: "enterprise-docs",
      car1_threshold: 0.65
    })
  });
  
  return await response.json();
}`,
    Python: `import requests

def query_cosavu(prompt):
    url = "https://api.cosavu.com/query"
    payload = {
        "query": prompt,
        "model": "${selectedModel}",
        "system": "car-1",
        "collection": "enterprise-docs",
        "car1_threshold": 0.65
    }
    headers = {"X-API-Key": "${apiKey}"}
    
    response = requests.post(url, json=payload, headers=headers)
    return response.json()`
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex h-screen w-full flex-col shadow-none overflow-y-auto relative">

          {/* Header */}
          <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4 sticky top-0 z-50">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
            <h1 className="text-sm font-medium text-muted-foreground">Getting Started</h1>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-10 w-full max-w-7xl mx-auto flex flex-col gap-10">

            {/* Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-card p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col z-10 space-y-4 max-w-xl">
                <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
                  <span className="text-2xl">👋</span>
                  Hi {user?.displayName ? user.displayName.split(' ')[0] : 'Developer'}, welcome to Cosavu!
                </h2>
                <p className="text-muted-foreground text-lg">
                  Take your Gen AI apps to production <span className="italic text-foreground">confidently</span> in just a few steps
                </p>
                <div className="flex flex-wrap items-center gap-6 mt-2 text-sm font-medium text-muted-foreground">
                  <a href="#" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Terminal className="size-4" /> Developer Docs
                  </a>
                  <a href="#" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <svg viewBox="0 0 24 24" className="fill-current size-4"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                    Join Discord
                  </a>
                  <a href="#" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <svg viewBox="0 0 24 24" className="fill-current size-4"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                    View Github
                  </a>
                </div>
              </div>

              {/* Product demo graphic */}
              <div className="relative w-full max-w-[320px] aspect-video rounded-xl bg-gradient-to-br from-rose-500 via-indigo-600 to-purple-800 p-0.5 hidden sm:block shadow-lg flex-shrink-0">
                <div className="w-full h-full bg-card/80 backdrop-blur-sm rounded-[10px] overflow-hidden relative flex items-center justify-end">
                  <div className="absolute top-4 left-4 z-10 text-white font-bold text-xl drop-shadow-md leading-snug">
                    Product<br />Demo
                  </div>
                  <PlayCircle className="absolute bottom-4 left-4 text-white size-8 drop-shadow-md z-10" />
                  <div className="w-3/5 h-5/6 bg-muted border border-border rounded translate-x-4 p-2 flex flex-col gap-2 opacity-80">
                    <div className="flex justify-between items-center bg-card border border-border rounded p-1">
                      <span className="block h-1 w-8 bg-muted-foreground/30 rounded-full" />
                      <span className="block h-1 w-4 bg-muted-foreground/30 rounded-full" />
                    </div>
                    <div className="h-full w-full bg-gradient-to-t from-orange-500/20 to-transparent border-b-2 border-orange-500 relative rounded-sm">
                      <svg className="absolute w-full h-full opacity-60" preserveAspectRatio="none">
                        <path d="M0,50 Q10,20 20,40 T40,60 T60,30 T80,50 T100,20 L100,100 L0,100 Z" fill="rgba(249,115,22,0.1)" stroke="#f97316" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Content - Centered */}
            <div className="flex flex-col items-center gap-16 w-full py-10">

              {/* Step 1 */}
              <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold">Setup your environment</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">Get your Cosavu API key & create a new LLM integration</p>
                </div>

                <div className="bg-card rounded-2xl p-8 shadow-sm w-full flex flex-col gap-10">
                  {/* API Key block */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <svg className="size-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <h4 className="font-semibold text-lg">Your Cosavu API key is ready to use</h4>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">Use this to authenticate all your requests to Cosavu</p>
                    <div className="w-full max-w-lg flex items-center bg-muted rounded-xl px-4 py-3 mt-2 relative group">
                      <span className="font-mono text-sm text-muted-foreground flex-1 truncate">
                        {showKey ? apiKey : apiKey.replace(/.(?=.{4})/g, '*')}
                      </span>
                      <div className="flex items-center gap-3 text-muted-foreground ml-4">
                        <button className="hover:text-foreground transition-colors p-1" onClick={() => setShowKey(!showKey)}>
                          {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                        <button className="hover:text-foreground transition-colors p-1" onClick={copyToClipboard}>
                          {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                        </button>
                        <button className="hover:text-foreground transition-colors p-1" onClick={generateNewKey}>
                          <RefreshCw className="size-4" />
                        </button>
                      </div>
                      {copied && (
                        <div className="absolute -top-10 left-1/2 -track-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded border shadow-xl animate-in fade-in zoom-in duration-200">
                          Copied!
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-border w-1/4 mx-auto opacity-50" />

                  {/* LLM Connect block */}
                  <div className="flex flex-col items-center gap-5">
                    <h4 className="font-semibold text-lg text-center">Securely connect to your LLM</h4>
                    <p className="text-sm text-muted-foreground text-center">We encrypt your original API keys and generate <span className="underline underline-offset-2 decoration-muted-foreground">disposable keys</span></p>
                    <Select>
                      <SelectTrigger className="w-full max-w-lg mt-1 h-12 rounded-xl">
                        <SelectValue placeholder="Select new AI provider to integrate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google Gemini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold">Integrate Cosavu</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">Choose a framework to integrate Cosavu with. Then, make a test request from your AI app.</p>
                </div>

                <div className="bg-card rounded-2xl p-8 shadow-sm min-h-[300px] w-full flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-full border border-border/50">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                      </span>
                      <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">LISTENING FOR REQUESTS FROM YOUR APP</span>
                    </div>
                    <button className="text-xs font-bold text-sky-500 hover:text-sky-400 flex items-center gap-1.5 transition-colors">
                      Need Help?
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                    {/* Code Snippet Block */}
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-center gap-3">
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                          <SelectTrigger className="h-10 rounded-xl px-4 bg-muted w-[140px] border-none shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NodeJS">NodeJS</SelectItem>
                            <SelectItem value="Python">Python</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="h-10 rounded-xl px-6 bg-muted border-none shadow-none w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cosavu-small">Cosavu Small</SelectItem>
                        <SelectItem value="cosavu-medium">Cosavu Medium</SelectItem>
                        <SelectItem value="cosavu-large">Cosavu Large</SelectItem>
                      </SelectContent>
                    </Select>
                      </div>

                      <div className="bg-muted rounded-xl p-6 font-mono text-muted-foreground text-[13px] leading-relaxed border border-border/10 relative overflow-hidden group min-h-[320px]">
                        <div className="flex gap-2 mb-4 opacity-30">
                           <div className="size-2.5 rounded-full bg-red-500/50" />
                           <div className="size-2.5 rounded-full bg-amber-500/50" />
                           <div className="size-2.5 rounded-full bg-emerald-500/50" />
                        </div>
                        <pre className="whitespace-pre-wrap overflow-x-auto text-[#e4e4e7] dark:text-[#a1a1aa]">
                          <code>{codeSnippets[selectedLanguage]}</code>
                        </pre>
                        <button 
                          className="absolute top-4 right-4 p-2 bg-background/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            navigator.clipboard.writeText(codeSnippets[selectedLanguage]);
                            alert("Snippet copied!");
                          }}
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Performance Insights Block */}
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-center h-10">
                        <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground opacity-50">STAN-1 Optimization stats</span>
                      </div>
                      
                      <div className="bg-[#0c0c0e] rounded-xl p-6 border border-border/20 flex flex-col gap-8 flex-1 min-h-[320px]">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Token Reduction</span>
                            <span className="text-4xl font-bold text-emerald-500">80.9%</span>
                            <span className="text-[10px] text-emerald-500/50 mt-1 flex items-center gap-1">
                              <Check className="size-2" /> Verified Baseline
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Avg Latency</span>
                            <span className="text-4xl font-bold text-sky-500">14.2ms</span>
                            <span className="text-[10px] text-sky-500/50 mt-1">Real-time Inference</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                           <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-muted-foreground">Messiness Score</span>
                              <span className="text-foreground">0.4729</span>
                           </div>
                           <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 w-[47%]" />
                           </div>
                           
                           <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-muted-foreground">Compression Target</span>
                              <span className="text-foreground">59.9%</span>
                           </div>
                           <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-sky-500 w-[60%]" />
                           </div>
                        </div>

                        <div className="flex-1 bg-muted/30 rounded-lg p-3 font-mono text-[10px] text-zinc-500 overflow-y-auto max-h-[100px]">
                          <div className="flex gap-2 text-emerald-500 opacity-80"><span>[STAN]</span> <span>✓ Model loaded and ready</span></div>
                          <div className="flex gap-2"><span>[STAN]</span> <span className="text-zinc-400">✓ Metadata generated in 8.0ms</span></div>
                          <div className="flex gap-2"><span>[STAN]</span> <span>⚠ Using defaults: DISABLED FOR TEST</span></div>
                          <div className="flex gap-2 text-sky-500 opacity-80"><span>[STAN]</span> <span>✓ Compression Gate: OPEN</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
