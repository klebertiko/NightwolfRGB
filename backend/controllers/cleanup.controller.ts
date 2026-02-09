import { exec } from 'child_process';
import * as util from 'util';
const execPromise = util.promisify(exec);

// Lista completa de processos RGB conhecidos que podem conflitar
const RGB_PROCESSES: { windows: string[] } = {
    windows: [
        // Corsair iCUE
        'iCUEService',
        'iCUE',
        'CorsairService',
        'CorsairLLAService',
        'CorsairGamingAudioCfgService',

        // ASUS Armoury Crate / Aura
        'ArmouryCrate.Service',
        'ArmouryCrate.UserSessionHelper',
        'ArmourySocketServer',
        'AsusSystemAnalysis',
        'AsusSystemDiagnosis',
        'AsusCertService',
        'AuraService',
        'LightingService',
        'AsusUpdateCheck',
        'GameVisual',

        // Razer Synapse / Chroma
        'RzSDKService',
        'RzActionSvc',
        'RazerCentralService',
        'Razer Synapse Service',
        'RazerIngameEngine',
        'RzChromaSDKService',
        'RzChromaStreamServer',

        // MSI
        'MSIAfterburner',
        'MSICM',
        'MSI_LED_Tool',
        'MSIDragonCenter',
        'MysticLight',
        'MSI_SDK',

        // NZXT CAM
        'CAM',
        'NZXTCamService',
        'CamService',

        // Gigabyte
        'GigabyteRGB',
        'RGBFusion',
        'GCC',
        'RGBFusion2',

        // ASRock
        'AsrPollingService',
        'AsrKernelService',
        'AsrLED',
        'Polychrome RGB',

        // EVGA
        'EVGA Precision X1',
        'LEDSync',

        // SignalRGB
        'SignalRgb',
        'SignalRgbService',

        // Cooler Master
        'MasterPlus',
        'CMPortal',

        // Thermaltake
        'TTRGBPlus',
        'ThermaltakeTT',

        // EKWB
        'EKWB-Connect',
        'EKConnect',

        // NVIDIA
        'NvidiaGPU',
        'NvBackend',

        // Logitech
        'LGHUB',
        'LCore',
        'LogiOverlay',

        // SteelSeries
        'SteelSeriesEngine3',
        'GG',
        'SteelSeriesGG',

        // HyperX
        'HyperXNGenuity',
        'NGenuity',

        // Generic/Others
        'LightingService.exe',
        'RGBController',
        'LEDkeeper',
        'JackNet RGB Sync'
    ]
};

export class RGBCleanupService {
    private platform: string;
    private conflictingProcesses: string[];

    constructor() {
        this.platform = process.platform;
        this.conflictingProcesses = [];
    }

    /**
     * Detecta processos RGB em execução
     */
    async detectConflictingProcesses(): Promise<any> {
        if (this.platform !== 'win32') {
            return { detected: false, message: 'Cleanup only supported on Windows' };
        }

        try {
            const { stdout } = await execPromise('tasklist /FO CSV /NH');
            const runningProcesses = stdout.toLowerCase();

            this.conflictingProcesses = RGB_PROCESSES.windows.filter(process => {
                return runningProcesses.includes(process.toLowerCase());
            });

            return {
                detected: this.conflictingProcesses.length > 0,
                count: this.conflictingProcesses.length,
                processes: this.conflictingProcesses,
                message: this.conflictingProcesses.length > 0
                    ? `${this.conflictingProcesses.length} processos RGB concorrentes detectados`
                    : 'Nenhum processo RGB concorrente detectado'
            };
        } catch (error: any) {
            console.error('Error detecting processes:', error);
            return { detected: false, error: error.message };
        }
    }

    /**
     * Mata processos RGB concorrentes
     */
    async killConflictingProcesses(): Promise<any> {
        if (this.platform !== 'win32') {
            return { success: false, message: 'Cleanup only supported on Windows' };
        }

        const results: any[] = [];
        const killed: string[] = [];
        const failed: string[] = [];

        for (const processName of RGB_PROCESSES.windows) {
            try {
                // Tenta matar o processo
                await execPromise(`taskkill /F /IM "${processName}.exe" /T 2>nul`);
                killed.push(processName);
                results.push({ process: processName, status: 'killed', success: true });
            } catch (error: any) {
                // Processo não existe ou já foi morto
                if (!error.message.includes('not found')) {
                    failed.push(processName);
                    results.push({ process: processName, status: 'failed', success: false, error: error.message });
                }
            }
        }

        return {
            success: true,
            killed: killed.length,
            failed: failed.length,
            processesKilled: killed,
            processesFailed: failed,
            details: results,
            message: `✅ Limpeza concluída: ${killed.length} processos finalizados`
        };
    }

    /**
     * Verifica serviços do Windows e tenta desabilitá-los temporariamente
     */
    async disableRGBServices(): Promise<any> {
        if (this.platform !== 'win32') {
            return { success: false, message: 'Service control only supported on Windows' };
        }

        const services = [
            'ArmouryCrateControlInterface',
            'AsusHalSensor',
            'CorsairService',
            'RzSDKService',
            'RzActionSvc',
            'CAMService'
        ];

        const results: any[] = [];

        for (const service of services) {
            try {
                await execPromise(`net stop "${service}" 2>nul`);
                results.push({ service, status: 'stopped', success: true });
            } catch (error) {
                // Serviço não existe ou não pode ser parado
                results.push({ service, status: 'not_found_or_failed', success: false });
            }
        }

        return {
            success: true,
            results,
            message: 'Tentativa de parar serviços RGB concluída'
        };
    }

    /**
     * Cleanup completo (processos + serviços)
     */
    async fullCleanup(): Promise<any> {
        console.log('🧹 Iniciando RGB Cleanup...');

        // Detecta primeiro
        const detection = await this.detectConflictingProcesses();
        console.log(`📊 Detecção: ${detection.message}`);

        // Mata processos
        const processKill = await this.killConflictingProcesses();
        console.log(`🔪 Processos: ${processKill.message}`);

        // Para serviços
        const serviceStop = await this.disableRGBServices();
        console.log(`⚙️  Serviços: ${serviceStop.message}`);

        return {
            success: true,
            detection,
            processKill,
            serviceStop,
            summary: {
                processesDetected: detection.count || 0,
                processesKilled: processKill.killed || 0,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Gera relatório de status
     */
    async getStatusReport(): Promise<any> {
        const detection = await this.detectConflictingProcesses();

        return {
            platform: this.platform,
            supported: this.platform === 'win32',
            detection,
            recommendations: detection.detected
                ? 'Execute o cleanup para melhor controle RGB'
                : 'Sistema limpo, controle RGB otimizado'
        };
    }
}

export default new RGBCleanupService();
