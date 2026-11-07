import type { BidderStatus, TrainingStatus } from "./types";

/* Declaration order is display order: STATUSES is derived from these keys,
   so the board columns and every dropdown follow it. */
export const STATUS_LABEL: Record<TrainingStatus, string> = {
  created: "Created",
  applied: "Applied",
  approved: "Approved",
  ongoing: "Ongoing",
  rejected: "Rejected",
};

/** Tone per status, mapped onto the existing chip colours. */
export const STATUS_TONE: Record<TrainingStatus, string> = {
  created: "neutral",
  applied: "warn",
  approved: "ok",
  ongoing: "violet",
  rejected: "danger",
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
