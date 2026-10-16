import type {FileReviewResult, ReviewResult} from '../engine/reviewProject';
import type {ProjectSelection} from './reviewer-api';

export {};

declare global {
  interface Window {
    reviewer: {
      selectProject(): Promise<ProjectSelection | null>;
      selectDocsRoot(projectRoot: string): Promise<string | null>;
      reviewProject(projectRoot: string, docsRoot: string): Promise<ReviewResult>;
      reviewFile(projectRoot: string, docsRoot: string, relativePath: string): Promise<FileReviewResult>;
      reviewTextProject(projectRoot: string, docsRoot: string): Promise<ReviewResult>;
      reviewTextFile(projectRoot: string, docsRoot: string, relativePath: string): Promise<FileReviewResult>;
    };
  }
}
