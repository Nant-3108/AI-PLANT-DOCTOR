export interface DiagnosticResult {
  diagnosis: string;         // E.g. "Early Blight" or "No disease found"
  confidence: 'High' | 'Medium' | 'Low' | null;
  rawMarkdown: string;       // Full markdown of response
  isDiseased: boolean;
}

export interface PlantScan {
  id: string;
  timestamp: string;
  imageName: string;
  imageUrl: string; // Base64 data-URL or preset URL
  result: DiagnosticResult;
}

export interface PresetLeaf {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  type: 'diseased' | 'healthy' | 'non-plant';
}
