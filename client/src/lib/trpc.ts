import { createTRPCReact } from "@trpc/react-query";

// Was `AppRouter` imported straight from the backend's server/routers.ts for
// full end-to-end type safety. Now that the backend lives in its own
// project, that import no longer resolves here, so calls are untyped
// (`trpc.someRouter.someProcedure` won't autocomplete or type-check).
//
// To get type safety back later, either:
//   1. Publish the backend's `AppRouter` type from a small shared package
//      both projects depend on, or
//   2. Keep this a monorepo (e.g. an npm/pnpm workspace) so this file can
//      import the type directly again, like:
//      import type { AppRouter } from "../../../backend/server/routers";
// Cast the whole client to `any`: trpc's generated hook types can't be
// resolved without a concrete router shape, so trying to type this at the
// generic level (createTRPCReact<any>()) still produces confusing errors.
// Casting here means `trpc.someRouter.someProcedure.useQuery(...)` compiles
// without autocomplete/type-checking, matching every call site in this app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>() as any;
