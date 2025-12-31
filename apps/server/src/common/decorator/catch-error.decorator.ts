/**
 * @param logger
 * @constructor
 */
export function CatchError() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (e) {
        console.error(
          `CatchError ${propertyKey} ${e.message}, ${JSON.stringify(args)}  \n ${e.stack}`,
        );
      }
    };
    return descriptor;
  };
}
