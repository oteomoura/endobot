# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Expose the app port (this will be used later)
EXPOSE 3000

# Keep the container running (temporary, until we add the app)
CMD ["tail", "-f", "/dev/null"]
