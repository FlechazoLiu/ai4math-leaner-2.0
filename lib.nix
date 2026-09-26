{
  devPkgs = {
    pkgs,
    system ? "x86_64-linux",
  }:
    with pkgs; ([
        libiconv
        openssl
        uv
        bashInteractive
        alejandra
        which
        coreutils
        gnumake
        git
        fd
        ripgrep
        shellcheck
        bubblewrap
        protobuf
        buf
        ruff
        prisma-engines
        caddy
      ]
      ++ (with nodePackages_latest; [nodejs pnpm prettier eslint prisma])
      ++ (
        if (system == "aarch64-darwin" || system == "x86_64-darwin")
        then [darwin.apple_sdk.frameworks.SystemConfiguration]
        else []
      ));
}
