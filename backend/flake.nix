{
  description = "CS Club Voting API";

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
        pyDeps = with pkgs.python312Packages; [
            sqlmodel
            alembic
            aiosqlite
            #pyjwt
            #argon2-cffi
            #jinja2
            python-multipart
            uvicorn
            fastapi
          ];
        # All dependencies, including non-python-packages
        deps = with pkgs;
          [
            python312
            uv
          ] ++ pyDeps;
      in rec {

        # Construct default dev package, which runs setup.py to find packages
        packages.default = pkgs.python312Packages.buildPythonApplication rec {
          pname = "vapi";
          version = "0.0.0";

          propagatedBuildInputs = pyDeps;
          src = ./.;

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
        packages.prod = packages.default.override {preInstall = "mode=run";};

        # We dont require a C compiler here so we use mkShellNoCC
        devShells.default = pkgs.mkShellNoCC {
          # Simply forward all required packages so we can use make and fastapi commands easily
          packages = deps;
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
