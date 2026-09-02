import type {ReviewResult} from '../engine/reviewProject';

export {};

declare global {
  interface Window {
    reviewer: {
      selectProject(): Promise<string | null>;
      reviewProject(projectRoot: string): Promise<ReviewResult>;
    };
  }
}
