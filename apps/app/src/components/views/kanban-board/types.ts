import { Feature, AgentModel, ThinkingLevel, FeatureImage } from "@/store/app-store";
import { FeatureImagePath as DescriptionImagePath } from "@/components/ui/description-image-dropzone";

export interface NewFeatureState {
  category: string;
  description: string;
  steps: string[];
  images: FeatureImage[];
  imagePaths: DescriptionImagePath[];
  skipTests: boolean;
  model: AgentModel;
  thinkingLevel: ThinkingLevel;
}

export const DEFAULT_NEW_FEATURE: NewFeatureState = {
  category: "",
  description: "",
  steps: [""],
  images: [],
  imagePaths: [],
  skipTests: false,
  model: "opus",
  thinkingLevel: "none",
};

export interface BoardActionHandlers {
  onStartImplementation: (feature: Feature) => Promise<boolean>;
  onRunFeature: (feature: Feature) => Promise<void>;
  onVerifyFeature: (feature: Feature) => Promise<void>;
  onResumeFeature: (feature: Feature) => Promise<void>;
  onManualVerify: (feature: Feature) => void;
  onMoveBackToInProgress: (feature: Feature) => void;
  onMoveToWaitingApproval: (feature: Feature) => void;
  onCommitFeature: (feature: Feature) => Promise<void>;
  onRevertFeature: (feature: Feature) => Promise<void>;
  onMergeFeature: (feature: Feature) => Promise<void>;
  onCompleteFeature: (feature: Feature) => void;
  onUnarchiveFeature: (feature: Feature) => void;
  onDeleteFeature: (featureId: string) => Promise<void>;
  onForceStopFeature: (feature: Feature) => Promise<void>;
  onStartNextFeatures: () => Promise<void>;
  onAddFeature: (feature: Omit<Feature, "id">) => void;
  onUpdateFeature: (featureId: string, updates: Partial<Feature>) => void;
  onOpenFollowUp: (feature: Feature) => void;
  onSendFollowUp: (featureId: string, prompt: string, imagePaths: string[]) => Promise<void>;
}
