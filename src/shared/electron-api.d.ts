import type {ReviewResult} from '../engine/reviewProject';
import type {ProjectSelection} from './reviewer-api';

export {};

declare global {
  interface Window {
    reviewer: {
      selectProject(): Promise<ProjectSelection | null>;
      selectDocsRoot(projectRoot: string): Promise<string | null>;
      reviewProject(projectRoot: string, docsRoot: string): Promise<ReviewResult>;
    };
  }
}
