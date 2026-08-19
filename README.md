# AppServer Remote Agent Suite

This directory is a standalone deployment repository boundary. It is intentionally
outside the AppServer pnpm workspace and contains the protocol, remote agent and
MCP bridge packages used by a separately deployed machine.

The directory can be published as its own Git repository and then consumed by
the AppServer repository as a Git submodule. The parent repository does not
execute these packages or grant them access to the AppServer host by default.
