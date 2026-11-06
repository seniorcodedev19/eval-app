import type { BidderStatus, TrainingStatus } from "./types";

export const STATUS_LABEL: Record<TrainingStatus, string> = {
  created: "Created",
  applied: "Applied",
  approved: "Approved",
  rejected: "Rejected",
  on_hold: "On hold",
};

/** Tone per status, mapped onto the existing chip colours. */
export const STATUS_TONE: Record<TrainingStatus, string> = {
  created: "neutral",
  applied: "warn",
  approved: "ok",
  rejected: "danger",
  on_hold: "muted",
};

export const STATUSES = Object.keys(STATUS_LABEL) as TrainingStatus[];

export const BIDDER_LABEL: Record<BidderStatus, string> = {
  none: "Not assigned",
  assigned: "Assigned",
  bidding: "Bidding",
};

export const BIDDER_TONE: Record<BidderStatus, string> = {
  none: "muted",
  assigned: "neutral",
  bidding: "ok",
};

export const BIDDER_STATUSES = Object.keys(BIDDER_LABEL) as BidderStatus[];
