import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from '@/components/page-container';
import { Check, AlertCircleIcon, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GettingStartedPage() {
  return (
    <PageContainer className="flex flex-col items-center pt-20 pb-10 min-h-screen">
      {/* Badge */}
      <Badge 
        variant="success" 
        className="mb-8 rounded-full px-4 py-1.5 flex items-center gap-2"
      >
        <span className="bg-[#4ADE80] text-black rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
          <Check strokeWidth={4} className="w-2.5 h-2.5" />
        </span>
        RUNNING
      </Badge>

      {/* Title */}
      <h1 className="text-4xl md:text-6xl font-black text-center mb-6 tracking-tight">
        Getting Started with <span className="text-[#8B5CF6]">Lootex Core</span>
      </h1>

      {/* Subtitle */}
      <p className="text-muted-foreground text-center max-w-2xl mb-16 text-lg leading-relaxed">
        Your local instance is up and running. Follow the configuration steps below to
        connect your preferred blockchain, brand your marketplace, and import your NFT
        collections.
      </p>

      {/* Tabs */}
      <Tabs defaultValue="network" className="w-full max-w-6xl">
        <div className="flex justify-center mb-10">
          <TabsList className="grid w-full grid-cols-3 md:w-[600px] bg-secondary/30 h-12 p-1">
            <TabsTrigger value="network" className="h-10 text-base">Network Setup</TabsTrigger>
            <TabsTrigger value="branding" className="h-10 text-base">Branding</TabsTrigger>
            <TabsTrigger value="collections" className="h-10 text-base">Collections</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="network">
          <div className="border border-white/5 rounded-3xl bg-card/20 backdrop-blur-sm p-2">
            <div className="rounded-2xl border border-white/5 bg-card p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Left Content */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-brand flex items-center gap-3">
                    <span className="bg-brand/20 text-brand w-10 h-10 rounded-xl flex items-center justify-center text-sm font-mono border border-brand/20">01</span>
                    Configure Blockchain
                  </h2>
                  <p className="text-muted-foreground">
                    Lootex Core connects to EVM-compatible chains via RPC. You need to define
                    the CHAIN_ID and provide a valid RPC_URL in your server environment file or copy `.env.example` for default settings.
                  </p>
                </div>

                <Alert variant="default" >
                  <AlertCircleIcon />
                  <AlertTitle className="font-bold">File Location</AlertTitle>
                  <AlertDescription className="font-mono">
                    <ul>
                      <li>/apps/server/configs/.env</li>
                      <li>/apps/client/src/lib/wagmi.ts</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <AlertDescription>
                    Restart the docker container after changing .env files for changes to take effect.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Right Content - Code Snippet */}
              <div className="bg-[#0D1117] rounded-xl border border-white/5 p-6 font-mono text-sm overflow-hidden relative shadow-2xl">
                <div className="flex items-center justify-between mb-6 opacity-60 border-b border-white/5 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">apps/server/configs/.env</span>
                </div>
                <div className="space-y-2 text-muted-foreground/80 font-mono">
                  <p><span className="text-slate-600"># --- Network Configuration ---</span></p>
                  <p>
                    <span className="text-purple-400">CHAIN_ID</span>=
                    <span className="text-orange-300">1</span> 
                    <span className="text-slate-600 ml-4">// 1 for Mainnet, 137 for Polygon</span>
                  </p>
                  <p>
                    <span className="text-purple-400">CHAIN_NAME</span>=
                    <span className="text-green-400">"Ethereum"</span>
                  </p>
                  <p>
                    <span className="text-purple-400">CHAIN_CURRENCY_SYMBOL</span>=
                    <span className="text-green-400">"ETH"</span>
                  </p>
                  <div className="h-4"></div>
                  <p><span className="text-slate-600"># --- RPC Provider (Infura/Alchemy) ---</span></p>
                  <p className="whitespace-nowrap overflow-x-auto">
                    <span className="text-purple-400">CHAIN_RPC_URL_MAIN</span>=
                    <span className="text-green-400">"https://eth-mainnet.g.alchemy.com/v2/KEY"</span>
                  </p>
                  <div className="h-4"></div>
                  <p><span className="text-slate-600"># --- Block Explorer ---</span></p>
                  <p>
                    <span className="text-purple-400">CHAIN_EXPLORER_URL</span>=
                    <span className="text-green-400">"https://etherscan.io"</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branding">
          <div className="border border-white/5 rounded-3xl bg-card/20 backdrop-blur-sm p-2">
            <div className="rounded-2xl border border-white/5 bg-card p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Left Content */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-brand flex items-center gap-3">
                    <span className="bg-brand/20 text-brand w-10 h-10 rounded-xl flex items-center justify-center text-sm font-mono border border-brand/20">02</span>
                    Customize Branding
                  </h2>
                  <p className="text-muted-foreground">
                    Personalize your marketplace by updating the client configuration file. 
                    You can change the app name, logo, description, and navigation links 
                    to match your brand identity.
                  </p>
                </div>

                <Alert variant="default" >
                  <AlertCircleIcon />
                  <AlertTitle className="font-bold">File Location</AlertTitle>
                  <AlertDescription className="font-mono">
                    /apps/client/src/lib/config.ts
                  </AlertDescription>
                </Alert>
              </div>

              {/* Right Content - Code Snippet */}
              <div className="bg-[#0D1117] rounded-xl border border-white/5 p-6 font-mono text-sm overflow-hidden relative shadow-2xl">
                <div className="flex items-center justify-between mb-6 opacity-60 border-b border-white/5 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">apps/client/src/lib/config.ts</span>
                </div>
                <div className="space-y-2 text-muted-foreground/80 font-mono">
                  <p><span className="text-purple-400">export const</span> config = {`{`}</p>
                  <p className="pl-4">
                    <span className="text-blue-300">appName</span>: 
                    <span className="text-green-400"> "Lootex Core"</span>,
                  </p>
                  <p className="pl-4">
                    <span className="text-blue-300">appDescription</span>: 
                    <span className="text-green-400"> "The Most Playful..."</span>,
                  </p>
                  <p className="pl-4">
                    <span className="text-blue-300">appLogo</span>: 
                    <span className="text-green-400"> "/logo.svg"</span>,
                  </p>
                  <p className="pl-4">
                    <span className="text-blue-300">appUrl</span>: 
                    <span className="text-green-400"> "https://lootex.gg"</span>,
                  </p>
                   <p className="pl-4">
                    <span className="text-blue-300">socialLinks</span>: {`{`}
                  </p>
                  <p className="pl-8">
                    <span className="text-blue-300">discord</span>: 
                    <span className="text-green-400"> "#"</span>,
                  </p>
                  <p className="pl-8">
                    <span className="text-blue-300">x</span>: 
                    <span className="text-green-400"> "#"</span>
                  </p>
                  <p className="pl-4">{`}`},</p>
                  <p className="pl-4">
                    <span className="text-slate-500">// Configure header & footer links...</span>
                  </p>
                  <p>{`}`}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collections">
          <div className="border border-white/5 rounded-3xl bg-card/20 backdrop-blur-sm p-2">
            <div className="rounded-2xl border border-white/5 bg-card p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Left Content */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-brand flex items-center gap-3">
                    <span className="bg-brand/20 text-brand w-10 h-10 rounded-xl flex items-center justify-center text-sm font-mono border border-brand/20">03</span>
                    Import Collections
                  </h2>
                  <p className="text-muted-foreground">
                    To import NFT collections, you need to whitelist them in the server configuration. 
                    The poller scans the blockchain for events from these contracts. 
                  </p>
                  <ul className="list-disc list-inside">
                    <li>Follow the format: `ADDRESS:START_ID:END_ID`</li>
                    <li>Use 0 as start/end ID for infinite range</li>
                    <li>Multiple collections can be separated by commas</li>
                  </ul>
                </div>

                <Alert variant="default" >
                  <AlertCircleIcon />
                  <AlertTitle className="font-bold">File Location</AlertTitle>
                  <AlertDescription className="font-mono">
                    lootex-core/apps/server/configs/.env
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <AlertDescription>
                    Restart the docker container after changing .env files for changes to take effect.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Right Content - Code Snippet */}
              <div className="bg-[#0D1117] rounded-xl border border-white/5 p-6 font-mono text-sm overflow-hidden relative shadow-2xl">
                <div className="flex items-center justify-between mb-6 opacity-60 border-b border-white/5 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">apps/server/configs/.env</span>
                </div>
                <div className="space-y-2 text-muted-foreground/80 font-mono">
                  <p><span className="text-slate-600"># --- Event Poller Whitelist ---</span></p>
                   <p><span className="text-slate-600"># Format: ADDRESS:START_ID:END_ID</span></p>
                  <div className="h-4"></div>
                  <p className="break-all leading-loose">
                    <span className="text-purple-400">NFT_POLLER_WHITELIST_SONEIUM</span>=
                    <span className="text-green-400">
                      "0xfc8...01ab:0:6665, 0x123...:0:1000"
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
