import type { CloudflareApi } from './index.js';

/** Request types keyed by the OpenAPI operationId used to generate them. */
export interface SdkOperationRequestMap {
  "addHopperItem": CloudflareApi.AddHopperItemRequest;
  "createHopper": CloudflareApi.CreateHopperRequest;
  "createItem": CloudflareApi.CreateItemRequest;
  "createStub": CloudflareApi.CreateStubRequest;
  "createSubscription": CloudflareApi.CreateSubscriptionRequest;
  "deleteHopper": CloudflareApi.DeleteHopperRequest;
  "deleteItem": CloudflareApi.DeleteItemRequest;
  "deleteSignal": CloudflareApi.DeleteSignalRequest;
  "deleteSubscription": CloudflareApi.DeleteSubscriptionRequest;
  "forkItem": CloudflareApi.ForkItemRequest;
  "generateItem": CloudflareApi.GenerateItemRequest;
  "getForkOptions": CloudflareApi.GetForkOptionsRequest;
  "getHopper": CloudflareApi.GetHopperRequest;
  "getImportedItem": CloudflareApi.GetImportedItemRequest;
  "getItem": CloudflareApi.GetItemRequest;
  "getMentionSource": CloudflareApi.GetMentionSourceRequest;
  "getVersion": CloudflareApi.GetVersionRequest;
  "listItems": CloudflareApi.ListItemsRequest;
  "listReading": CloudflareApi.ListReadingRequest;
  "pauseSubscription": CloudflareApi.PauseSubscriptionRequest;
  "pinItem": CloudflareApi.PinItemRequest;
  "preview": CloudflareApi.PreviewRequest;
  "publishItem": CloudflareApi.PublishItemRequest;
  "removeHopperItem": CloudflareApi.RemoveHopperItemRequest;
  "restoreItem": CloudflareApi.RestoreItemRequest;
  "resumeSubscription": CloudflareApi.ResumeSubscriptionRequest;
  "resyncSubscription": CloudflareApi.ResyncSubscriptionRequest;
  "search": CloudflareApi.SearchRequest;
  "setMentionHidden": CloudflareApi.SetMentionHiddenRequest;
  "setResponses": CloudflareApi.SetResponsesRequest;
  "setSignal": CloudflareApi.SetSignalRequest;
  "updateHopper": CloudflareApi.UpdateHopperRequest;
  "updateItem": CloudflareApi.UpdateItemRequest;
  "updateSettings": CloudflareApi.UpdateSettingsRequest;
  "updateSubscription": CloudflareApi.UpdateSubscriptionRequest;
  "uploadMedia": CloudflareApi.UploadMediaRequest;
  "withdrawItem": CloudflareApi.WithdrawItemRequest;
}

/** Query-only projections of generated SDK request types. */
export interface SdkOperationQueryMap {
  "getForkOptions": Pick<CloudflareApi.GetForkOptionsRequest, Extract<"id" | "sub" | "origin", keyof CloudflareApi.GetForkOptionsRequest>>;
  "listItems": Pick<CloudflareApi.ListItemsRequest, Extract<"offset" | "limit", keyof CloudflareApi.ListItemsRequest>>;
  "listReading": Pick<CloudflareApi.ListReadingRequest, Extract<"page" | "sub", keyof CloudflareApi.ListReadingRequest>>;
  "search": Pick<CloudflareApi.SearchRequest, Extract<"offset" | "q", keyof CloudflareApi.SearchRequest>>;
}

export type SdkOperationId = keyof SdkOperationRequestMap;
export type SdkQueryOperationId = keyof SdkOperationQueryMap;

export type SdkRequest<OperationId extends SdkOperationId> =
  SdkOperationRequestMap[OperationId];

export type SdkQuery<OperationId extends SdkQueryOperationId> =
  SdkOperationQueryMap[OperationId];

