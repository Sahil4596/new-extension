export class TelemetryService {
    public static logEvent(eventName: string, properties?: Record<string, any>) {
        // Stub for production telemetry (e.g. AppInsights, Segment)
        // console.log(`[Telemetry] ${eventName}`, properties);
    }

    public static logAnalysis(duration: number, riskLevel: string, fileCount: number) {
        this.logEvent('analysis_completed', {
            duration,
            riskLevel,
            fileCount
        });
    }
}
