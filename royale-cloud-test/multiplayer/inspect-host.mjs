import os from 'node:os';
import {readFileSync,statfsSync} from 'node:fs';
const read=path=>{try{return readFileSync(path,'utf8').trim();}catch{return null;}};
const disk=statfsSync(process.cwd());
console.log(JSON.stringify({timestamp:new Date().toISOString(),runtime:process.version,platform:os.platform(),architecture:os.arch(),cpuModel:os.cpus()[0]?.model,logicalCPUs:os.cpus().length,availableParallelism:os.availableParallelism(),memoryBytes:os.totalmem(),freeMemoryBytes:os.freemem(),cgroupCPU:read('/sys/fs/cgroup/cpu.max'),cgroupMemory:read('/sys/fs/cgroup/memory.max'),processLimits:read('/proc/self/limits'),diskAvailableBytes:disk.bavail*disk.bsize,networkBandwidthLimit:'Must be read from the hosting plan; not inferable from this process.',webSocketIngress:'Must be tested through the actual HTTPS reverse proxy.'},null,2));
