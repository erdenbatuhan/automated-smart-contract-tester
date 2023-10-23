# Use the latest Ubuntu image as the base
FROM ubuntu:latest

# Install essential utilities: curl & git
RUN apt-get -y update
RUN apt-get -y install curl
RUN apt-get -y install git

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="${PATH}:/root/.foundry/bin"
RUN foundryup

# Set the working directory to /app
WORKDIR /app

# Copy the configuration files into the container
COPY foundry.toml .
COPY remappings.txt .

# Install the libraries after copying the required files needed for that purpose into the container
COPY .gitmodules .
COPY install_libraries.sh .
RUN git init
RUN ./install_libraries.sh

# Copy the tests into the container
COPY test test

# (1) "forge build": Ensures that the compiler is pre-installed and the dependencies are pre-created
# (2) "forge snapshot": (1) + Generates gas snapshots for all the test functions using the solution (the src folder) provided
COPY src src
# RUN forge build (Redundant, as "forge snapshot" already compiles the project)
RUN forge snapshot --snap .gas-snapshot
RUN rm -rf src/*

# Remove the build artifacts and cache directories
RUN forge clean

# Run the tests (make sure to copy the "src" folder containing the implemented contracts before running the container!)
CMD ["forge", "test", "-vv"]
