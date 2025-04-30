const vscode = require('vscode');

class TreeDataProvider {
  static viewType = 'codeMood.treeView';

  getTreeItem(element) {
    return element;
  }

  getChildren() {
    return [
      new CommandItem('🎵 Play Music', 'codeMood.openMusicPanel'),
      new CommandItem('😀 Analyze Mood', 'codeMood.analyzeMood'),
      new CommandItem('👃 Detect Code Smells', 'codeMood.runSmellDetector'),
      new CommandItem('⏳ Time Analysis', 'codeMood.showTimeChart'),
      new CommandItem('🎮 Play Bug Smasher', 'codeMood.playBugSmasher'),
      new CommandItem('🎮 Play Brick Wall', 'codeMood.playBrickWall'),
      new CommandItem('🎮 Play 2048', 'codeMood.play2048'),
      new CommandItem('🎹 Enable Piano Keyboard', 'codeMood.enablePiano'),
      new CommandItem('🎸 Funky Typing Effect', 'codeMood.funkyType'),
    ];
  }
}

class CommandItem extends vscode.TreeItem {
  constructor(label, commandId) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: commandId,
      title: label
    };
    this.contextValue = 'commandItem';
  }
}
  
module.exports = TreeDataProvider;