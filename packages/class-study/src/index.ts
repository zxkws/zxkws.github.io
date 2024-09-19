import chalk from "chalk";

class SpectorMudole {}

// function ApiPure(target: any, key: string, descriptor: any) {
//   chalk.blue(target, "11111111111111", key, descriptor);
// }

function Api(options: any) {
  return function (target: any, key: string) {
    console.log(chalk.blue(target, "22222222222", key));
  };
}

function query() {
  return new Promise((resolve, reject) => {
    resolve({});
  });
}

class NodeMangeModule extends SpectorMudole {
  @Api({})
  list = query;
}

const instance = new NodeMangeModule();
instance.list();

interface Person {
  name: string;
  age: number;
  key: NodeMangeModule;
}

export const person: Person = {
  name: "hql",
  age: 18,
  key: instance,
};

function Xx() {
  console.log("xxxxx");
}
