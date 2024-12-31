{
  description = "CS Club Voting App and API";

  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
  # Create packages and shells for every OS
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
        # Python package dependencies
        pyPackages = with pkgs.python312Packages; [
            # sqlmodel
            # alembic
            # aiosqlite
            #pyjwt
            #argon2-cffi
            #jinja2
            uv
            # python-multipart
            # uvicorn
            # fastapi
          ];
          pyDeps = with pkgs; [
            python312
          ] ++ pyPackages;
      in rec {

        # This is mainly for use in CI or deployment, just use pnpm for development
        # Normally we are using pnpm, but for CI and deployment we want the nix build,
        # so we need an npm lockfile. Solution is rn -rf node_modules and run npm i --package-lock-only
        packages.frontend = pkgs.buildNpmPackage {
          pname = "myvote";
          version = "0.0.0";
          npmDepsHash = "sha256-8pKzROHa1eQ2/RVxSz3SA7POpXvRPGPtRz/KnWcWdlw=";
          src = ./frontend;
          postInstall = ''
            mkdir -p $out/bin
            cat <<EOF > $out/bin/myvote
            #!/usr/bin/env sh
            cd $out/lib/node_modules/myvote
            ${pkgs.http-server}/bin/http-server dist
            EOF
            chmod +x $out/bin/myvote
          '';
          # Maybe if we use this in prod replace this with some other http server?
          propagatedBuildInputs = [pkgs.http-server];

        };

        packages.default = packages.backend;

        packages.backend-dev = pkgs.python312Packages.buildPythonApplication rec {
          pname = "vapi";
          version = "0.0.0";

          propagatedBuildInputs = pyPackages;
          src = ./backend;

          # Use a bash variable for the run mode so we can override it
          preInstall = "mode=dev";

          # Create the run script in bin/vapi that pulls fastapi and main.py from nix store
          postInstall = ''
            mkdir -p $out/bin
            cat <<EOF > $out/bin/vapi
            #!/usr/bin/env sh
            ${pkgs.python312Packages.fastapi}/bin/fastapi $mode ${src}/app/main.py
            EOF
            chmod +x $out/bin/vapi
          '';
        };

        # Our prod package is the same but with mode=run instead of mode=dev
        packages.backend-prod = packages.default.override {preInstall = "mode=run";};

        # We dont require a C compiler here so we use mkShellNoCC
        devShells.default = pkgs.mkShellNoCC {
          # Simply forward all required packages so we can use make and fastapi commands easily
          packages = pyDeps;
          name = "vapi";

          # Shellhook to sync uv is below if using non-nixpkgs python packages

          # shellHook = ''
          #   if [ ! -d ".venv" ]; then
          #       uv venv --python ${pkgs.python312}
          #   fi
          #   source .venv/bin/activate
          #   uv pip sync requirements.txt
          # '';
        };
      }
    );
}
