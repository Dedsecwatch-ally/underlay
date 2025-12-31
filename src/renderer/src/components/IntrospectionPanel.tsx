import React, { useEffect, useState, useRef } from 'react';
import { Activity, Shield, Zap, Layers, Network, Clock as ClockIcon, TrendingUp } from 'lucide-react';
import classNames from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';
import { NetworkGraph } from './NetworkGraph';
import { MemoryGraph } from './MemoryGraph';
import { PermissionGraph } from './PermissionGraph';

interface NetworkLog {
    id: number;
    requestId?: string;
    url: string;
    method: string;
    status?: number;
    type?: string;
    startTime: number;
    endTime?: number;
    headers?: Record<string, string[]>;
    fromDiskCache?: boolean;
    fromServiceWorker?: boolean;
    timing?: {
        requestTime: number;
        proxyStart: number;
        proxyEnd: number;
        dnsStart: number;
        dnsEnd: number;
        connectStart: number;
        connectEnd: number;
        sslStart: number;
        sslEnd: number;
        workerStart: number;
        workerReady: number;
        sendStart: number;
        sendEnd: number;
        pushStart: number;
        pushEnd: number;
        receiveHeadersEnd: number;
    }
}

export function IntrospectionPanel({ isOpen }: { isOpen: boolean }) {
    const [logs, setLogs] = useState<NetworkLog[]>([]);
    const [perfData, setPerfData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'network' | 'perf' | 'security' | 'trace' | 'specs' | 'privacy' | 'tools'>('specs');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
    const [blockedPatterns, setBlockedPatterns] = useState<string[]>([]);

    // Timeline State
    const [timelineValue, setTimelineValue] = useState<number>(100);
    const [isLive, setIsLive] = useState(true);

    // Advanced Vis State
    const [memoryHistory, setMemoryHistory] = useState<Record<number, { timestamp: number, heap: number, rss: number }[]>>({});

    useEffect(() => {
        if (!isOpen) return;
          
        let unsubNetwork: (() => void) | undefined;
        let unsubPerf: (() => void) | undefined;

        // Activate Monitoring
        // @ts-ignore
        if (window.electron.toggleNetworkMonitoring) window.electron.toggleNetworkMonitoring(true);

        // CDP Handling (Network)
        // @ts-ignore
        if (window.electron.onNetworkCDP) {
            // @ts-ignore
            unsubNetwork = window.electron.onNetworkCDP((data) => {
                setLogs(prev => {
                    if (data.method === 'Network.requestWillBeSent') {
                        return [...prev.slice(-200), {
                            id: Date.now(),
                            requestId: data.requestId,
                            url: 'Requesting...',
                            method: '...',
                            startTime: data.timestamp,
                            type: 'CDP'
                        }];
                    } else if (data.method === 'Network.responseReceived') {
                        const idx = prev.findIndex(l => l.requestId === data.requestId);
                        if (idx !== -1) {
                            const updated = [...prev];
                            updated[idx] = {
                                ...updated[idx],
                                timing: data.timing,
                                status: 200,
                                url: '[CDP] Response',
                                method: 'GET',
                                fromDiskCache: data.fromDiskCache,
                                fromServiceWorker: data.fromServiceWorker
                            };
                            return updated;
                        } else {
                            return [...prev.slice(-200), {
                                id: Date.now(),
                                requestId: data.requestId,
                                url: 'Captured Resource',
                                method: 'GET',
                                startTime: data.timestamp,
                                timing: data.timing,
                                status: 200,
                                fromDiskCache: data.fromDiskCache,
                                fromServiceWorker: data.fromServiceWorker
                            }];
                        }
                    }
                    return prev;
                });
            });
        }

        // @ts-ignore
        if (window.electron.onPerformanceUpdate) {
            // @ts-ignore
            unsubPerf = window.electron.onPerformanceUpdate((data) => {
                setPerfData(data);

                // Update Memory History
                setMemoryHistory(prev => {
                    const next = { ...prev };
                    data.metrics.forEach((m: any) => {
                        const processInfo = data.processMap.find((p: any) => p.pid === m.pid);
                        if (processInfo && processInfo.type === 'webview') {
                            const cdp = (processInfo as any).cdp || {};
                            const heap = cdp.JSHeapUsedSize ? (cdp.JSHeapUsedSize / 1024 / 1024) : 0;
                            const rss = (m.memory.workingSetSize / 1024 / 1024);

                            if (!next[m.pid]) next[m.pid] = [];
                            next[m.pid] = [...next[m.pid].slice(-60), { timestamp: Date.now(), heap, rss }];
                        }
                    });
                    return next;
                });
            });
        }

        return () => {
            if (unsubNetwork) unsubNetwork();
            if (unsubPerf) unsubPerf();
            // @ts-ignore
            if (window.electron.toggleNetworkMonitoring) window.electron.toggleNetworkMonitoring(false);
        }
    }, [isOpen]);

    const handleBlock = (url: string) => {
        try {
            const domain = url;
            const pattern = `*${domain}*`;
            if (!blockedPatterns.includes(pattern)) {
                const newPatterns = [...blockedPatterns, pattern];
                setBlockedPatterns(newPatterns);
                // @ts-ignore
                if (window.electron.setBlockedPatterns) window.electron.setBlockedPatterns(newPatterns);
            }
        } catch (e) { }
    };

    const handleReplay = (log: NetworkLog) => {
        if (log.url.startsWith('http')) {
            fetch(log.url, { method: log.method }).catch(err => console.error("Replay failed", err));
        }
    };

    const displayedLogs = isLive ? logs : logs.slice(0, Math.floor((timelineValue / 100) * logs.length));

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 50, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-[450px] glass-panel flex flex-col font-sans text-xs shadow-2xl z-50 absolute right-4 top-16 bottom-4 rounded-xl overflow-hidden border border-white/10"
                >
                    {/* Tab Headers */}
                    <div className="h-10 flex bg-[#0f0f11]/50 border-b border-white/10">
                        <TabButton active={activeTab === 'specs'} onClick={() => setActiveTab('specs')} icon={<Activity size={14} />} label="SPECS" />
                        <TabButton active={activeTab === 'network'} onClick={() => setActiveTab('network')} icon={<Network size={14} />} label="NETWORK" />
                        <TabButton active={activeTab === 'perf'} onClick={() => setActiveTab('perf')} icon={<Zap size={14} />} label="PERF" />
                        <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Shield size={14} />} label="SECURITY" />
                        <TabButton active={activeTab === 'privacy'} onClick={() => setActiveTab('privacy')} icon={<Layers size={14} />} label="PRIVACY" />
                        <TabButton active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={<Activity size={14} />} label="TOOLS" />
                    </div>

                    <div className="flex-1 overflow-auto p-2" ref={scrollRef}>
                        {/* Network Tab */}
                        {activeTab === 'network' && (
                            <div className="flex flex-col gap-1 pb-10">
                                <NetworkGraph logs={displayedLogs} />

                                <div className="flex items-center gap-2 mb-2 p-2 bg-white/5 rounded">
                                    <button
                                        onClick={() => { setIsLive(!isLive); if (!isLive) setTimelineValue(100); }}
                                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${isLive ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white/50'}`}
                                    >
                                        {isLive ? 'LIVE' : 'PAUSED'}
                                    </button>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={timelineValue}
                                        onChange={(e) => {
                                            setTimelineValue(parseInt(e.target.value));
                                            setIsLive(parseInt(e.target.value) === 100);
                                        }}
                                        className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-underlay-accent"
                                    />
                                    <span className="text-[10px] w-8 text-right opacity-50">{timelineValue}%</span>
                                </div>

                                {blockedPatterns.length > 0 && (
                                    <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                                        <div className="font-bold text-red-500 mb-1">Blocked Patterns</div>
                                        {blockedPatterns.map(p => (
                                            <div key={p} className="flex justify-between items-center opacity-70">
                                                <span>{p}</span>
                                                <button onClick={() => {
                                                    const newPatterns = blockedPatterns.filter(x => x !== p);
                                                    setBlockedPatterns(newPatterns);
                                                    // @ts-ignore
                                                    if (window.electron.setBlockedPatterns) window.electron.setBlockedPatterns(newPatterns);
                                                }}>x</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {displayedLogs.slice().reverse().map(log => (
                                    <React.Fragment key={log.id}>
                                        <div
                                            className="bg-white/5 p-2 rounded cursor-pointer hover:bg-white/10 group relative"
                                            onClick={() => setSelectedLogId(selectedLogId === log.id ? null : log.id)}
                                        >
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-blue-400">{log.method || 'GET'}</span>
                                                <div className="flex gap-2">
                                                    {log.fromDiskCache && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1 rounded">CACHE</span>}
                                                    {log.fromServiceWorker && <span className="text-[9px] bg-orange-500/20 text-orange-500 px-1 rounded">WORKER</span>}
                                                    <span className={log.status === 200 ? 'text-green-400' : 'text-white/50'}>{log.status || '...'}</span>
                                                </div>
                                            </div>
                                            <div className="truncate opacity-60 mb-2">{log.url}</div>

                                            <div className="absolute left-0 top-full mt-1 bg-black border border-white/10 p-2 rounded shadow-xl z-50 hidden group-hover:block w-64 pointer-events-none">
                                                <div className="font-bold text-white mb-1">Protocol Details</div>
                                                <div className="grid grid-cols-2 gap-1 text-[10px] opacity-70">
                                                    <div>Params:</div><div>{log.url.includes('?') ? 'Yes' : 'No'}</div>
                                                    <div>Secure:</div><div>{log.url.startsWith('https') ? 'TLS 1.3' : 'No'}</div>
                                                    <div>ID:</div><div>{log.requestId?.slice(0, 6) || 'N/A'}</div>
                                                </div>
                                            </div>

                                            {log.timing && (
                                                <div className="flex h-1.5 bg-black/50 rounded overflow-hidden">
                                                    <div style={{ flex: log.timing.dnsEnd - log.timing.dnsStart }} className="bg-yellow-500" title="DNS" />
                                                    <div style={{ flex: log.timing.connectEnd - log.timing.connectStart }} className="bg-orange-500" title="TCP" />
                                                    <div style={{ flex: log.timing.sslEnd - log.timing.sslStart }} className="bg-purple-500" title="SSL" />
                                                    <div style={{ flex: 20 }} className="bg-green-500" title="Transfer" />
                                                </div>
                                            )}
                                        </div>

                                        {selectedLogId === log.id && (
                                            <motion.div
                                                initial={{ height: 0 }} animate={{ height: 'auto' }}
                                                className="bg-[#111] p-3 rounded text-[10px] overflow-hidden"
                                            >
                                                <div className="flex gap-2 mb-3 pb-2 border-b border-white/10">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleReplay(log); }}
                                                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-blue-400"
                                                    >
                                                        Replay
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleBlock(log.url); }}
                                                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-red-400"
                                                    >
                                                        Block Domain
                                                    </button>
                                                </div>

                                                {log.timing && (
                                                    <>
                                                        <WaterfallRow label="Queueing" start={0} duration={log.timing.dnsStart} color="bg-gray-600" />
                                                        <WaterfallRow label="DNS Lookup" start={log.timing.dnsStart} duration={log.timing.dnsEnd - log.timing.dnsStart} color="bg-yellow-500" />
                                                        <WaterfallRow label="TCP Handshake" start={log.timing.connectStart} duration={log.timing.connectEnd - log.timing.connectStart} color="bg-orange-500" />
                                                        <WaterfallRow label="SSL Negotiation" start={log.timing.sslStart} duration={log.timing.sslEnd - log.timing.sslStart} color="bg-purple-500" />
                                                        <WaterfallRow label="Request Sent" start={log.timing.sendStart} duration={log.timing.sendEnd - log.timing.sendStart} color="bg-blue-500" />
                                                        <WaterfallRow label="Waiting (TTFB)" start={log.timing.sendEnd} duration={log.timing.receiveHeadersEnd - log.timing.sendEnd} color="bg-green-500" />
                                                    </>
                                                )}
                                            </motion.div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {activeTab === 'specs' && (
                            <div className="p-2 text-white/50">System Specs View</div>
                        )}

                        {activeTab === 'perf' && perfData && (
                            <div className="flex flex-col gap-4">
                                {perfData.metrics.map((metric: any, i: number) => {
                                    const processInfo = perfData.processMap.find((p: any) => p.pid === metric.pid);
                                    if (!processInfo || processInfo.type !== 'webview') return null;

                                    const cdp = (processInfo as any).cdp || {};
                                    const jsHeap = cdp.JSHeapUsedSize ? (cdp.JSHeapUsedSize / 1024 / 1024).toFixed(1) : '0';
                                    const layouts = cdp.LayoutCount || 0;
                                    const styles = cdp.RecalculateStyleCount || 0;

                                    // Leak Detection Heuristic
                                    const history = memoryHistory[metric.pid] || [];
                                    const isLeaking = history.length > 10 && history[history.length - 1].heap > history[0].heap * 1.2; // >20% growth in window

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            key={metric.pid + '-' + i} className="bg-white/5 p-3 rounded border border-white/5"
                                        >
                                            <div className="flex justify-between mb-2 pb-2 border-b border-white/5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-underlay-accent truncate max-w-[200px]" title={processInfo.url}>
                                                        {processInfo.url ? new URL(processInfo.url).hostname : 'New Tab'}
                                                    </span>
                                                    {isLeaking && <div className="text-red-500 flex items-center gap-1 font-bold animate-pulse">⚠️ Possible Leak</div>}
                                                </div>
                                                <span className="opacity-50 text-[10px]">PID: {metric.pid}</span>
                                            </div>

                                            {/* Memory Graph */}
                                            <MemoryGraph history={memoryHistory[metric.pid] || []} width={360} height={60} />

                                            <div className="grid grid-cols-2 gap-3 mb-2">
                                                <div>
                                                    <div className="text-[10px] opacity-40 uppercase">Memory (OS)</div>
                                                    <div className="text-lg font-mono text-white">{(metric.memory.workingSetSize / 1024 / 1024).toFixed(0)} <span className="text-sm opacity-50">MB</span></div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] opacity-40 uppercase">V8 Heap</div>
                                                    <div className="text-lg font-mono text-yellow-400">{jsHeap} <span className="text-sm opacity-50">MB</span></div>
                                                </div>
                                            </div>

                                            {/* Pipeline Vis */}
                                            <div className="mb-3 p-2 bg-black/20 rounded">
                                                <div className="text-[9px] opacity-50 uppercase mb-1">Rendering Pipeline</div>
                                                <div className="flex gap-1 h-2">
                                                    <div className="flex-1 bg-purple-500 rounded transition-all duration-300" style={{ opacity: styles > 0 ? 1 : 0.2 }} title="Styles" />
                                                    <div className="flex-1 bg-blue-500 rounded transition-all duration-300" style={{ opacity: layouts > 0 ? 1 : 0.2 }} title="Layout" />
                                                    <div className="flex-1 bg-green-500 rounded transition-all duration-300" style={{ opacity: 0.2 }} title="Paint" /> {/* Mock Paint for now */}
                                                </div>
                                                <div className="flex text-[9px] opacity-40 justify-between mt-1">
                                                    <span>STYLE</span><span>LAYOUT</span><span>PAINT</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => // @ts-ignore
                                                        window.electron.perfControl.freeze(metric.pid, true) // Simplified toggle logic needed in real app
                                                    }
                                                    className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-1 rounded text-[10px] border border-blue-500/10"
                                                >
                                                    ❄️ Freeze
                                                </button>
                                                <button
                                                    onClick={() => // @ts-ignore
                                                        window.electron.perfControl.gc(metric.pid)
                                                    }
                                                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-1 rounded text-[10px] border border-green-500/10"
                                                >
                                                    🧹 Force GC
                                                </button>
                                                <select
                                                    onChange={(e) => // @ts-ignore
                                                        window.electron.perfControl.throttleNetwork(metric.pid, e.target.value)
                                                    }
                                                    className="flex-1 bg-white/10 text-white text-[10px] rounded border-white/5 outline-none"
                                                >
                                                    <option value="Online">Online</option>
                                                    <option value="Slow 3G">Slow 3G</option>
                                                    <option value="Offline">Offline</option>
                                                </select>
                                            </div>

                                        </motion.div>
                                    );
                                })}
                                {perfData.metrics.every((m: any) => !perfData.processMap.find((p: any) => p.pid === m.pid && p.type === 'webview')) && (
                                    <div className="text-white/30 text-center italic">No active web pages...</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <SecurityTab />
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function SecurityTab() {
    const [permissions, setPermissions] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            // @ts-ignore
            if (window.electron.security) {
                // @ts-ignore
                const perms = await window.electron.security.getPermissions();
                setPermissions(perms);
            }
        };
        fetch();
        const interval = setInterval(fetch, 2000); // Poll for updates
        return () => clearInterval(interval);
    }, []);

    const handleRevoke = (origin: string, bg: string) => {
        // @ts-ignore
        if (window.electron.security) window.electron.security.revoke(origin, bg);
        // Optimistic update
        setPermissions(prev => prev.filter(p => p.origin !== origin || p.permission !== bg));
    };

    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="bg-white/5 p-3 rounded">
                <div className="text-[10px] opacity-40 uppercase mb-2">Permission Graph</div>
                <PermissionGraph permissions={permissions} onRevoke={handleRevoke} />
            </div>

            <div className="bg-white/5 p-3 rounded">
                <div className="text-[10px] opacity-40 uppercase mb-2">Active Permissions</div>
                {permissions.length === 0 && <div className="text-white/30 italic">No active permissions</div>}
                {permissions.map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-black/20 p-2 rounded mb-1">
                        <div className="flex flex-col">
                            <span className="font-bold text-blue-400">{new URL(p.origin).hostname}</span>
                            <span className="text-[9px] opacity-60">{p.permission}</span>
                        </div>
                        <button
                            onClick={() => handleRevoke(p.origin, p.permission)}
                            className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[9px]"
                        >
                            Revoke
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WaterfallRow({ label, start, duration, color }: any) {
    if (duration <= 0) return null;
    const scale = 2; // px per ms
    return (
        <div className="flex items-center gap-2 mb-1">
            <div className="w-20 shrink-0 opacity-50 text-right">{label}</div>
            <div className="flex-1 relative h-3">
                <div
                    className={`absolute top-0 bottom-0 rounded ${color}`}
                    style={{ left: `${start * scale}px`, width: `${Math.max(duration * scale, 2)}px` }}
                />
                <div className="absolute top-0 bottom-0 text-[9px] opacity-70 ml-1" style={{ left: `${(start + duration) * scale}px` }}>
                    {duration.toFixed(2)}ms
                </div>
            </div>
        </div>
    )
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={classNames(
                "flex-1 flex items-center justify-center gap-2 border-b-2 transition-colors hover:bg-white/5",
                active ? "border-underlay-accent text-white" : "border-transparent text-white/40"
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}
